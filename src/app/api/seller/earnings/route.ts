/**
 * API: Get Seller Earnings
 * 
 * GET /api/seller/earnings
 * 
 * Returns seller's earnings breakdown, balance, and payout history
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user and store
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { Store: true }
    })

    if (!user || !user.Store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const store = user.Store

    // Get order items for this store (orders are linked via OrderItems)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        storeId: store.id
      },
      include: {
        Order: {
          include: {
            OrderItem: true
          }
        }
      }
    })

    // Extract unique orders from order items
    const orderMap = new Map()
    orderItems.forEach(item => {
      if (!orderMap.has(item.orderId)) {
        orderMap.set(item.orderId, item.Order)
      }
    })
    const orders = Array.from(orderMap.values())

    // Calculate earnings breakdown
    let totalProductEarnings = 0
    let totalShippingEarnings = 0
    let pendingBalance = 0
    let totalOrders = orders.length

    orders.forEach((order: any) => {
      totalProductEarnings += toNum(order.sellerProductEarnings)
      totalShippingEarnings += toNum(order.sellerShippingAmount)
      
      // Check if order is in pending period (e.g., less than 48 hours old)
      const orderAge = Date.now() - new Date(order.createdAt).getTime()
      const pendingPeriod = 48 * 60 * 60 * 1000 // 48 hours
      
      if (orderAge < pendingPeriod && order.status !== 'DELIVERED') {
        pendingBalance += toNum(order.sellerProductEarnings) + toNum(order.sellerShippingAmount)
      }
    })

    // Get payouts
    const payouts = await prisma.sellerPayout.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Calculate total withdrawn
    const totalWithdrawn = payouts
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + toNum(p.amount), 0)

    // Determine currency based on country
    const currencyMap: Record<string, string> = {
      'UGANDA': 'UGX',
      'KENYA': 'KES',
      'TANZANIA': 'TZS',
      'RWANDA': 'RWF'
    }
    const currency = currencyMap[store.country] || 'UGX'

    // Calculate available balance
    const availableBalance = Math.max(0, toNum(store.availableBalance))

    return NextResponse.json({
      store: {
        id: store.id,
        name: store.name,
        country: store.country,
        currency,
        payoutMethod: store.payoutMethod,
        payoutPhone: store.payoutPhone,
        payoutBankName: store.payoutBankName,
        payoutBankAccount: store.payoutBankAccount,
        flutterwaveSubaccountId: store.flutterwaveSubaccountId,
        commissionRate: toNum(store.commissionRate)
      },
      earnings: {
        availableBalance,
        pendingBalance,
        totalEarned: totalProductEarnings + totalShippingEarnings,
        productEarnings: totalProductEarnings,
        shippingEarnings: totalShippingEarnings,
        totalWithdrawn,
        totalOrders
      },
      payouts: payouts.map(p => ({
        id: p.id,
        amount: toNum(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.method,
        accountInfo: p.accountInfo,
        reference: p.reference,
        createdAt: p.createdAt,
        processedAt: p.processedAt
      }))
    })

  } catch (error) {
    console.error('Error fetching earnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
