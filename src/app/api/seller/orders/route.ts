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

    // Verify order contains items from this store
    const orderItem = await prisma.orderItem.findFirst({
      where: { orderId, storeId: store.id },
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(busCompany && { busCompany }),
        ...(busNumberPlate && { busNumberPlate }),
        ...(conductorPhone && { conductorPhone }),
        ...(pickupLocation && { pickupLocation }),
        ...(status === 'SHIPPED' && { estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
    })

    // Create notification for buyer
    if (order) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: status === 'SHIPPED' ? 'ORDER_SHIPPED' : 
                status === 'DELIVERED' ? 'ORDER_DELIVERED' : 'ORDER_CONFIRMED',
          title: `Order ${status.toLowerCase().replace(/_/g, ' ')}`,
          message: `Your order ${order.orderNumber} has been ${status.toLowerCase().replace(/_/g, ' ')}.`,
          data: JSON.stringify({ orderId: order.id }),
        },
      })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
