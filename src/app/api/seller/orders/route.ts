import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const orders = await prisma.order.findMany({
      where: {
        OrderItem: {
          some: { storeId: store.id }
        }
      },
      include: {
        OrderItem: {
          where: { storeId: store.id },
          include: {
            Product: {
              select: { id: true, name: true, images: true }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await req.json()
    const { orderId, status, busCompany, busNumberPlate, conductorPhone, pickupLocation } = body

    // SECURITY: Validate allowed status transitions for sellers
    const SELLER_ALLOWED_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY']
    if (status && !SELLER_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Sellers cannot set order status to '${status}'. Only buyer confirmation or admin can mark orders as DELIVERED.` },
        { status: 403 }
      )
    }

    // Verify order contains items from this store
    const orderItem = await prisma.orderItem.findFirst({
      where: { orderId, storeId: store.id },
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // SECURITY FIX: In multi-vendor orders, a seller should only update THEIR items' status,
    // not the global order status. Update OrderItem status for this store's items,
    // then derive the global order status from all items.
    if (status) {
      // Update all order items belonging to this seller's store
      await prisma.orderItem.updateMany({
        where: { orderId, storeId: store.id },
        data: { status },
      })
    }

    // Update only this seller's delivery fields (busCompany, etc.)
    // Use updateMany scoped to order items from this store
    await prisma.order.update({
      where: { id: orderId },
      data: {
        // Only update shipping fields (seller-specific)
        ...(busCompany && { busCompany }),
        ...(busNumberPlate && { busNumberPlate }),
        ...(conductorPhone && { conductorPhone }),
        ...(pickupLocation && { pickupLocation }),
        ...(status === 'SHIPPED' && { estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }),
        // Only update global status if this seller is the only vendor
        // For multi-vendor orders, the global status is derived from item statuses
      },
    })

    // Derive global order status from all items' statuses
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
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    // Create notification for buyer
    if (order) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: status === 'SHIPPED' ? 'ORDER_SHIPPED' : 'ORDER_CONFIRMED',
          title: `Order ${status.toLowerCase().replace(/_/g, ' ')}`,
          message: `Your order ${order.orderNumber} has been ${status.toLowerCase().replace(/_/g, ' ')}.`,
          data: JSON.stringify({ orderId: order.id, storeId: store.id }),
        },
      })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
