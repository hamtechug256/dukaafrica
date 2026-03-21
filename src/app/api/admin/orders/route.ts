import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch all orders (admin only)
export async function GET(req: Request) {
  try {
    const { userId } = await auth()

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

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const payment = searchParams.get('payment')
    const search = searchParams.get('search')

    // Build filter
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (payment) {
      where.paymentStatus = payment
    }
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { shippingName: { contains: search, mode: 'insensitive' } },
        { Store: { name: { contains: search, mode: 'insensitive' } } },
        { User: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        OrderItem: {
          select: { id: true },
        },
        Store: {
          select: { id: true, name: true, slug: true },
        },
        User: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Transform to match expected format
    const transformedOrders = orders.map((order) => ({
      ...order,
      items: order.OrderItem,
      store: order.Store,
      user: order.User,
    }))

    // Calculate stats
    const allOrders = await prisma.order.findMany({
      select: { status: true, paymentStatus: true, total: true, currency: true },
    })

    const stats = {
      total: allOrders.length,
      pending: allOrders.filter(o => o.status === 'PENDING').length,
      processing: allOrders.filter(o => o.status === 'PROCESSING').length,
      shipped: allOrders.filter(o => o.status === 'SHIPPED' || o.status === 'OUT_FOR_DELIVERY').length,
      delivered: allOrders.filter(o => o.status === 'DELIVERED').length,
      revenue: allOrders
        .filter(o => o.paymentStatus === 'PAID')
        .reduce((sum, o) => sum + (o.total || 0), 0),
    }

    return NextResponse.json({ orders: transformedOrders, stats })
  } catch (error) {
    console.error('Error fetching admin orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
