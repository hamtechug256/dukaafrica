import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// GET /api/seller/analytics - Get sales analytics for seller dashboard
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get orders in period
    const orders = await prisma.order.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        OrderItem: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Calculate totals
    const totalRevenue = orders.reduce((sum, order) => sum + (order.sellerProductEarnings || 0), 0)
    const totalOrders = orders.length
    const totalProductsSold = orders.reduce(
      (sum, order) => sum + order.OrderItem.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    )

    // Get product stats
    const productStats = await prisma.product.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        name: true,
        viewCount: true,
        purchaseCount: true,
        rating: true,
        reviewCount: true,
        quantity: true,
        status: true,
      },
    })

    // Top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        storeId: store.id,
        Order: {
          createdAt: { gte: startDate },
          status: { not: 'CANCELLED' },
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 10,
    })

    // Revenue by day (for chart)
    const revenueByDay: Record<string, { revenue: number; orders: number; products: number }> = {}
    
    orders.forEach(order => {
      const day = order.createdAt.toISOString().split('T')[0]
      if (!revenueByDay[day]) {
        revenueByDay[day] = { revenue: 0, orders: 0, products: 0 }
      }
      revenueByDay[day].revenue += order.sellerProductEarnings || 0
      revenueByDay[day].orders += 1
      revenueByDay[day].products += order.OrderItem.reduce((sum, item) => sum + item.quantity, 0)
    })

    // Fill in missing days
    const chartData: Array<{
      date: string
      revenue: number
      orders: number
      products: number
    }> = []
    const current = new Date(startDate)
    while (current <= now) {
      const day = current.toISOString().split('T')[0]
      chartData.push({
        date: day,
        ...revenueByDay[day] || { revenue: 0, orders: 0, products: 0 },
      })
      current.setDate(current.getDate() + 1)
    }

    // Order status breakdown
    const orderStatusBreakdown = await prisma.order.groupBy({
      by: ['status'],
      where: {
        storeId: store.id,
        createdAt: { gte: startDate },
      },
      _count: true,
    })

    // Get previous period for comparison
    const previousStartDate = new Date(startDate)
    previousStartDate.setTime(previousStartDate.getTime() - (now.getTime() - startDate.getTime()))
    
    const previousOrdersCount = await prisma.order.count({
      where: {
        storeId: store.id,
        createdAt: { gte: previousStartDate, lt: startDate },
        status: { not: 'CANCELLED' },
      },
    })

    const previousRevenue = await prisma.order.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: previousStartDate, lt: startDate },
        status: { not: 'CANCELLED' },
      },
      _sum: {
        sellerProductEarnings: true,
      },
    })

    // Calculate growth
    const prevRev = previousRevenue._sum.sellerProductEarnings || 0
    const revenueGrowth = prevRev > 0
      ? ((totalRevenue - prevRev) / prevRev) * 100
      : totalRevenue > 0 ? 100 : 0

    const ordersGrowth = previousOrdersCount > 0
      ? ((totalOrders - previousOrdersCount) / previousOrdersCount) * 100
      : totalOrders > 0 ? 100 : 0

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalOrders,
        totalProductsSold,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        ordersGrowth: parseFloat(ordersGrowth.toFixed(1)),
      },
      chartData,
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        productName: p.productName,
        quantitySold: p._sum.quantity || 0,
        revenue: p._sum.total || 0,
        orderCount: p._count,
      })),
      orderStatusBreakdown: orderStatusBreakdown.map(s => ({
        status: s.status,
        count: s._count,
      })),
      productStats: {
        total: productStats.length,
        active: productStats.filter(p => p.status === 'ACTIVE').length,
        draft: productStats.filter(p => p.status === 'DRAFT').length,
        outOfStock: productStats.filter(p => p.quantity === 0).length,
        lowStock: productStats.filter(p => p.quantity > 0 && p.quantity <= 5).length,
        totalViews: productStats.reduce((sum, p) => sum + p.viewCount, 0),
        avgRating: productStats.length > 0
          ? productStats.reduce((sum, p) => sum + p.rating, 0) / productStats.length
          : 0,
      },
      period,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
