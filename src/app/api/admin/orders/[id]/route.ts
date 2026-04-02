import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// Order Status Transition State Machine
// ---------------------------------------------------------------------------
// Each key is the current status; its value is the set of allowed next states.
// Terminal states (DELIVERED, CANCELLED, REFUNDED) have no outgoing transitions.
// ---------------------------------------------------------------------------
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],           // terminal
  CANCELLED: [],           // terminal
  REFUNDED: [],            // terminal
}

const ALL_STATUSES = Object.keys(VALID_TRANSITIONS)

/**
 * Map from status → timestamp field(s) to set when entering that status.
 * When an order transitions *into* a given status the corresponding
 * timestamp is stamped with the current date.
 */
const STATUS_TIMESTAMPS: Record<string, Record<string, Date>> = {
  SHIPPED: { shippedAt: new Date() },
  DELIVERED: { deliveredAt: new Date() },
  CANCELLED: { cancelledAt: new Date() },
  REFUNDED: { refundedAt: new Date() },
}

// ---------------------------------------------------------------------------
// Helper – format a human-readable list of allowed next states
// ---------------------------------------------------------------------------
function allowedTransitionsMessage(currentStatus: string): string {
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed || allowed.length === 0) {
    return `"${currentStatus}" is a terminal state – no further transitions are allowed.`
  }
  return `Allowed transitions from "${currentStatus}": ${allowed.join(', ')}.`
}

// ---------------------------------------------------------------------------
// GET – Fetch single order by ID (admin only)
// ---------------------------------------------------------------------------
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        OrderItem: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              }
            }
          }
        },
        Store: {
          select: {
            id: true,
            name: true,
            slug: true,
            User: {
              select: { email: true }
            }
          }
        },
        User: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Transform to match expected format
    const transformedOrder = {
      ...order,
      items: order.OrderItem.map((item) => ({
        ...item,
        product: item.Product,
      })),
      store: order.Store ? {
        ...order.Store,
        user: order.Store.User,
      } : null,
      user: order.User,
    }

    return NextResponse.json({ order: transformedOrder })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PUT – Update order status (admin only)
// ---------------------------------------------------------------------------
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an active admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, isActive: true },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { status } = body

    // 1. Validate that the requested status is a known value
    if (!ALL_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status "${status}". Valid statuses are: ${ALL_STATUSES.join(', ')}.`,
        },
        { status: 400 }
      )
    }

    // 2. Fetch the current order to inspect its status
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const currentStatus = existingOrder.status

    // If the requested status is the same as current, treat it as idempotent success
    if (currentStatus === status) {
      const order = await prisma.order.findUnique({ where: { id } })
      return NextResponse.json({ order })
    }

    // 3. Check the transition against the state machine
    const allowedNextStates = VALID_TRANSITIONS[currentStatus]

    if (!allowedNextStates || !allowedNextStates.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition order from "${currentStatus}" to "${status}". ${allowedTransitionsMessage(currentStatus)}`,
        },
        { status: 400 }
      )
    }

    // 4. Build the update payload – always update `status` and `updatedAt`,
    //    plus any timestamp fields associated with the target status.
    const timestampFields = STATUS_TIMESTAMPS[status] ?? {}

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        ...timestampFields,
      },
    })

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
