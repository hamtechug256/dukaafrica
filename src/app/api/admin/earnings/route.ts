/**
 * API: Admin Platform Earnings
 * 
 * GET /api/admin/earnings - Fetch platform earnings statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get platform settings
    const settings = await prisma.platformSettings.findFirst()

    // Get all paid orders for earnings calculation
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' }
    })

    // Calculate total earnings
    let totalCommission = 0
    let totalShippingMarkup = 0
    let pendingBalance = 0
    let deliveredOrders = 0

    paidOrders.forEach(order => {
      totalCommission += order.platformProductCommission || 0
      totalShippingMarkup += order.platformShippingMarkup || 0
      
      // Pending = not delivered yet
      if (order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
        pendingBalance += (order.platformProductCommission || 0) + (order.platformShippingMarkup || 0)
      }
      
      if (order.status === 'DELIVERED') {
        deliveredOrders++
      }
    })

    const totalEarnings = totalCommission + totalShippingMarkup

    // Calculate available balance (total - withdrawn - pending)
    const totalWithdrawn = await prisma.sellerPayout.aggregate({
      where: {
        // We'll use a separate model for platform withdrawals, for now use 0
      },
      _sum: { amount: true }
    })

    // Get platform withdrawals (using SellerPayout with a special store ID for platform)
    // For simplicity, we'll track platform balance separately
    const availableBalance = Math.max(0, totalEarnings - pendingBalance)

    // Get withdrawal history
    const withdrawals: any[] = [] // TODO: Create PlatformWithdrawal model

    // Get stats
    const [activeStores, activeProducts, totalOrders] = await Promise.all([
      prisma.store.count({ where: { isActive: true } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count()
    ])

    return NextResponse.json({
      earnings: {
        availableBalance,
        pendingBalance,
        totalCommission,
        totalShippingMarkup,
        totalEarnings,
        totalOrders,
        deliveredOrders,
        activeStores,
        activeProducts
      },
      withdrawals,
      settings: {
        defaultCommissionRate: settings?.defaultCommissionRate || 10,
        shippingMarkupPercent: settings?.shippingMarkupPercent || 5,
        adminPayoutMethod: settings?.adminPayoutMethod,
        adminPayoutPhone: settings?.adminPayoutPhone,
        adminPayoutBankName: settings?.adminPayoutBankName,
      }
    })

  } catch (error) {
    console.error('Error fetching platform earnings:', error)
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
  }
}
