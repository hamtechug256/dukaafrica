import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// GET - Fetch a single order for the seller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { id: orderId } = await params

    // Find the order and verify it contains items from this seller's store
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        OrderItem: {
          where: { storeId: store.id }, // Only get items belonging to this seller
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
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify this order has items from this seller
    if (order.OrderItem.length === 0) {
      return NextResponse.json({ 
        error: 'This order does not contain your products' 
      }, { status: 403 })
    }

    // Get currency based on store country
    const currencyMap: Record<string, string> = {
      'UGANDA': 'UGX',
      'KENYA': 'KES',
      'TANZANIA': 'TZS',
      'RWANDA': 'RWF'
    }
    const currency = currencyMap[store.country] || 'UGX'

    // Calculate seller-specific earnings from order (earnings are on the Order model)
    // For multi-seller orders, we calculate based on this seller's items
    const sellerItemsTotal = order.OrderItem.reduce((sum, item) => sum + toNum(item.total), 0)
    const sellerProductEarnings = toNum(order.sellerProductEarnings) || (sellerItemsTotal * 0.9) // Fallback to 90% if not set
    const sellerShippingAmount = toNum(order.sellerShippingAmount) || 0

    // Format response
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.OrderItem.reduce((sum, item) => sum + toNum(item.total), 0),
      shippingFee: toNum(order.shippingFee),
      total: toNum(order.total),
      currency,
      sellerProductEarnings,
      sellerShippingAmount,
      
      // Buyer shipping info (needed for delivery)
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingRegion: order.shippingRegion,
      shippingCountry: order.shippingCountry,
      
      // Bus/delivery details
      busCompany: order.busCompany,
      busNumberPlate: order.busNumberPlate,
      conductorPhone: order.conductorPhone,
      pickupLocation: order.pickupLocation,
      notes: order.notes,
      estimatedDelivery: order.estimatedDelivery,
      
      // Items - only this seller's items
      items: order.OrderItem.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: toNum(item.price),
        quantity: item.quantity,
        total: toNum(item.total),
        product: item.Product,
      })),
      
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deliveredAt: order.deliveredAt,
    }

    return NextResponse.json({ order: formattedOrder })

  } catch (error) {
    console.error('Error fetching seller order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PUT - Update order status and details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { 
      status, 
      busCompany, 
      busNumberPlate, 
      conductorPhone, 
      pickupLocation, 
      notes 
    } = body

    // SECURITY: Validate allowed status transitions for sellers
    const SELLER_ALLOWED_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY']
    if (status && !SELLER_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Sellers cannot set order status to '${status}'. Only buyer confirmation or admin can mark orders as DELIVERED.` },
        { status: 403 }
      )
    }

    // Verify order contains items from this seller
    const orderItem = await prisma.orderItem.findFirst({
      where: { orderId, storeId: store.id },
    })

    if (!orderItem) {
      return NextResponse.json({ 
        error: 'This order does not contain your products' 
      }, { status: 403 })
    }

    // SECURITY FIX: Update OrderItem status for this seller's items only,
    // then derive global order status from all items' statuses.
    if (status) {
      await prisma.orderItem.updateMany({
        where: { orderId, storeId: store.id },
        data: { status },
      })
    }

    // Update delivery fields only
    const updateData: any = {}
    if (busCompany !== undefined) updateData.busCompany = busCompany
    if (busNumberPlate !== undefined) updateData.busNumberPlate = busNumberPlate
    if (conductorPhone !== undefined) updateData.conductorPhone = conductorPhone
    if (pickupLocation !== undefined) updateData.pickupLocation = pickupLocation
    if (notes !== undefined) updateData.notes = notes
    if (status === 'SHIPPED') {
      updateData.estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      })
    }

    // Derive global order status from all items
    if (status) {
      const allItems = await prisma.orderItem.findMany({
        where: { orderId },
        select: { status: true },
      })
      const statuses = allItems.map(item => item.status)
      const allShipped = statuses.length > 0 && statuses.every(s => ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s))
      const anyShipped = statuses.some(s => ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s))

      let derivedGlobalStatus: string | undefined
      if (allShipped && !statuses.includes('DELIVERED')) {
        derivedGlobalStatus = 'SHIPPED'
      } else if (anyShipped) {
        derivedGlobalStatus = 'PROCESSING'
      } else if (statuses.every(s => ['CONFIRMED', 'PROCESSING'].includes(s))) {
        derivedGlobalStatus = 'PROCESSING'
      }

      if (derivedGlobalStatus) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: derivedGlobalStatus },
        })
      }
    }

    // Fetch updated order for response
    const order = await prisma.order.findUnique({ where: { id: orderId } })

    // Create notification for buyer on status change
    if (order && status) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: status === 'SHIPPED' ? 'ORDER_SHIPPED' : 'ORDER_PROCESSING',
          title: `Order ${status.toLowerCase().replace(/_/g, ' ')}`,
          message: `Your order ${order.orderNumber} has been ${status.toLowerCase().replace(/_/g, ' ')}.`,
          data: JSON.stringify({ orderId: order.id, storeId: store.id }),
        },
      })
    }

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Error updating seller order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
