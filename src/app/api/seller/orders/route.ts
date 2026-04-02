import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Seller Order Status Transition State Machine
// ---------------------------------------------------------------------------
//
// Valid seller-driven transitions (forward-only, no rollbacks):
//   CONFIRMED          → PROCESSING
//   PROCESSING         → SHIPPED
//   SHIPPED            → OUT_FOR_DELIVERY
//   OUT_FOR_DELIVERY   → DELIVERED  (only if buyer has already confirmed)
//
// Sellers CANNOT:
//   - Change PENDING orders (not yet paid)
//   - Set orders to DELIVERED unless buyer confirmed via /api/orders/[id]/confirm-delivery
//   - CANCEL orders (admin-only)
//   - Transition to earlier statuses (no rollbacks)
//   - Set statuses outside their allowed set (PENDING, DELIVERED, CANCELLED, REFUNDED, etc.)
// ---------------------------------------------------------------------------

type SellerStatus = 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'

/** All statuses a seller is allowed to target */
const SELLER_TARGET_STATUSES: SellerStatus[] = [
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

/**
 * Define the legal next-status for each current status.
 * This is the state machine: keys are current, values are the allowed next states.
 */
const SELLER_TRANSITIONS: Record<SellerStatus, SellerStatus[]> = {
  CONFIRMED: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'], // only if buyer confirmed (checked separately)
  DELIVERED: [],                    // terminal state — no further seller transitions
}

/**
 * Validate whether a seller-initiated status transition is legal.
 *
 * @param currentStatus - The current status of the order item(s)
 * @param targetStatus  - The status the seller wants to set
 * @param buyerConfirmed - Whether the buyer has confirmed delivery (deliveryConfirmedAt)
 * @returns An error message string if invalid, or null if valid.
 */
function validateSellerTransition(
  currentStatus: string,
  targetStatus: string,
  buyerConfirmed: boolean
): string | null {
  // ---- Reject target statuses not in the seller set ----
  if (!SELLER_TARGET_STATUSES.includes(targetStatus as SellerStatus)) {
    return `Sellers cannot set order status to '${targetStatus}'. Only buyer confirmation or admin can mark orders as DELIVERED or CANCELLED.`
  }

  // ---- Sellers cannot touch PENDING orders (not yet paid) ----
  if (currentStatus === 'PENDING') {
    return 'Cannot change order status while the order is still PENDING (awaiting payment). Payment must be confirmed first.'
  }

  // ---- Block CANCELLED / REFUNDED terminal states ----
  if (currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED') {
    return `Cannot modify an order that has been ${currentStatus.toLowerCase()}. Only admin can perform further actions.`
  }

  // ---- DELIVERED is a terminal state ----
  if (currentStatus === 'DELIVERED') {
    return 'Cannot change status of an order that has already been delivered.'
  }

  // ---- Normal state-machine check ----
  const allowedNext = SELLER_TRANSITIONS[currentStatus as SellerStatus]
  if (!allowedNext) {
    return `Unknown current order status: '${currentStatus}'. No transitions defined.`
  }

  if (!allowedNext.includes(targetStatus as SellerStatus)) {
    return `Invalid status transition: '${currentStatus}' → '${targetStatus}'. Allowed: ${allowedNext.join(', ') || 'none (terminal state)'}`
  }

  // ---- Special rule: DELIVERED can only be set if buyer has confirmed ----
  if (targetStatus === 'DELIVERED' && !buyerConfirmed) {
    return 'Cannot mark order as DELIVERED. The buyer must confirm delivery first via their order page.'
  }

  return null // valid
}

// ===========================================================================
// GET /api/seller/orders — List orders for the authenticated seller's store
// ===========================================================================

export async function GET(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user — only active accounts can access seller endpoints
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or account is inactive' },
        { status: 404 }
      )
    }

    // Resolve the seller's store
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // ---- Pagination ----
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const skip = (page - 1) * limit

    // Optional status filter
    const statusFilter = searchParams.get('status')
    const whereClause: any = {
      OrderItem: { some: { storeId: store.id } },
    }
    if (statusFilter) {
      whereClause.status = statusFilter
    }

    // Fetch paginated orders and total count in parallel
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          OrderItem: {
            where: { storeId: store.id },
            include: {
              Product: {
                select: { id: true, name: true, images: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: whereClause }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + orders.length < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// ===========================================================================
// PUT /api/seller/orders — Update an order (status, shipping details)
// ===========================================================================

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ---- Rate limiting: 15 order updates per minute per seller ----
    const rateLimit = await checkRateLimit(
      'seller_order_update',
      userId,
      15,
      60
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many order update attempts. Please try again later.',
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          },
        }
      )
    }

    // Fetch user — only active accounts can access seller endpoints
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or account is inactive' },
        { status: 404 }
      )
    }

    // Resolve the seller's store
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      orderId,
      status,
      busCompany,
      busNumberPlate,
      conductorPhone,
      pickupLocation,
    } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // ---- Verify this order contains items from the seller's store ----
    const sellerOrderItems = await prisma.orderItem.findMany({
      where: { orderId, storeId: store.id },
      select: { id: true, status: true },
    })

    if (sellerOrderItems.length === 0) {
      return NextResponse.json(
        { error: 'Order not found or contains no items from your store' },
        { status: 404 }
      )
    }

    // ---- Fetch the full order (need deliveryConfirmedAt for DELIVERED check) ----
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        paymentStatus: true,
        deliveryConfirmedAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ---- Status Transition Validation (State Machine) ----
    if (status) {
      // All seller's items must share the same current status for a uniform transition.
      // If items have diverged, we validate each item individually.
      const buyerConfirmed = !!order.deliveryConfirmedAt

      for (const item of sellerOrderItems) {
        const transitionError = validateSellerTransition(
          item.status,
          status,
          buyerConfirmed
        )
        if (transitionError) {
          return NextResponse.json(
            {
              error: transitionError,
              currentStatus: item.status,
              requestedStatus: status,
              orderItemId: item.id,
            },
            { status: 403 }
          )
        }
      }

      // Transition is valid — update all of this seller's order items
      await prisma.orderItem.updateMany({
        where: { orderId, storeId: store.id },
        data: { status },
      })
    }

    // ---- Update shipping fields on the order (scoped to seller data) ----
    const shippingData: any = {}
    if (busCompany) shippingData.busCompany = busCompany
    if (busNumberPlate) shippingData.busNumberPlate = busNumberPlate
    if (conductorPhone) shippingData.conductorPhone = conductorPhone
    if (pickupLocation) shippingData.pickupLocation = pickupLocation

    // Auto-set estimated delivery when shipping
    if (status === 'SHIPPED') {
      shippingData.estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      shippingData.shippedAt = new Date()
    }

    if (Object.keys(shippingData).length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: shippingData,
      })
    }

    // ---- Derive global order status from all items ----
    if (status) {
      const allItems = await prisma.orderItem.findMany({
        where: { orderId },
        select: { status: true },
      })

      const statuses = allItems.map((item) => item.status)

      // All items shipped or beyond
      const allShipped =
        statuses.length > 0 &&
        statuses.every((s) =>
          ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s)
        )
      // At least one shipped or beyond
      const anyShipped = statuses.some((s) =>
        ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s)
      )
      // All delivered
      const allDelivered =
        statuses.length > 0 && statuses.every((s) => s === 'DELIVERED')

      let derivedGlobalStatus: string | undefined

      if (allDelivered) {
        derivedGlobalStatus = 'DELIVERED'
      } else if (allShipped && !statuses.includes('DELIVERED')) {
        derivedGlobalStatus = 'SHIPPED'
      } else if (anyShipped) {
        derivedGlobalStatus = 'PROCESSING'
      } else if (
        statuses.every((s) => ['CONFIRMED', 'PROCESSING'].includes(s))
      ) {
        derivedGlobalStatus = 'PROCESSING'
      }

      if (derivedGlobalStatus && derivedGlobalStatus !== order.status) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: derivedGlobalStatus },
        })
      }
    }

    // ---- Fetch the fully updated order for the response ----
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    // ---- Create notification for buyer ----
    if (updatedOrder) {
      const notificationType =
        status === 'SHIPPED'
          ? 'ORDER_SHIPPED'
          : status === 'OUT_FOR_DELIVERY'
            ? 'ORDER_OUT_FOR_DELIVERY'
            : 'ORDER_STATUS_UPDATE'

      const statusLabel = (status || 'updated').toLowerCase().replace(/_/g, ' ')

      await prisma.notification.create({
        data: {
          userId: updatedOrder.userId,
          type: notificationType,
          title: `Order ${statusLabel}`,
          message: `Your order ${updatedOrder.orderNumber} has been ${statusLabel}.`,
          data: JSON.stringify({ orderId: updatedOrder.id, storeId: store.id }),
        },
      })
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
