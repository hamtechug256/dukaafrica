import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// GET - Fetch all orders (admin only) with pagination
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const payment = searchParams.get('payment')
    const search = searchParams.get('search')
    const storeId = searchParams.get('storeId')

    const skip = (page - 1) * limit

    // Build filter
    const where: any = {}
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    if (payment && payment !== 'ALL') {
      where.paymentStatus = payment
    }
    
    if (storeId) {
      where.storeId = storeId
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { shippingName: { contains: search, mode: 'insensitive' } },
        { shippingPhone: { contains: search } },
        { Store: { name: { contains: search, mode: 'insensitive' } } },
        { User: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Fetch paginated orders + total count in parallel
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          _count: {
            select: { OrderItem: true },
          },
          Store: {
            select: { id: true, name: true, slug: true },
          },
          User: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100), // Cap at 100
      }),
      prisma.order.count({ where }),
    ])

    // Transform to match expected format
    const transformedOrders = orders.map((order) => ({
      ...order,
      itemsCount: order._count.OrderItem,
      store: order.Store,
      user: order.User,
      // Serialize Decimal fields to numbers for JSON
      total: toNum(order.total),
      subtotal: toNum(order.subtotal),
      shippingFee: toNum(order.shippingFee),
      tax: toNum(order.tax),
      discount: toNum(order.discount),
    }))

    // Calculate stats using efficient count queries (no full table scan)
    const [
      totalCount,
      pendingCount,
      processingCount,
      shippedCount,
      deliveredCount,
      revenueData,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: { in: ['SHIPPED', 'OUT_FOR_DELIVERY'] } } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      // Sum platform earnings from PAID orders — manual sum avoids Prisma aggregate Decimal serialization bugs
      // Platform earnings = commission from product sales + shipping markup (NOT the full order total)
      prisma.order.findMany({
        where: { paymentStatus: 'PAID' },
        select: { platformProductCommission: true, platformShippingMarkup: true },
      }),
    ])

    // Compute platform earnings sum manually (safer than Prisma aggregate with Decimal)
    const revenue = revenueData.reduce((sum, o) =>
      sum + toNum(o.platformProductCommission) + toNum(o.platformShippingMarkup), 0
    )

    const stats = {
      total: totalCount,
      pending: pendingCount,
      processing: processingCount,
      shipped: shippedCount,
      delivered: deliveredCount,
      revenue, // Platform earnings (commission), NOT total order amount
    }

    return NextResponse.json({
      orders: transformedOrders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      stats,
      _debug: {
        deployCommit: 'd2b6f0f',
        itemCounts: transformedOrders.slice(0, 3).map(o => ({
          order: o.orderNumber,
          itemsCount: o.itemsCount,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching admin orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
