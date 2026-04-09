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

    // Get user and store (must be active)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
      include: { Store: true }
    })

    if (!user || !user.Store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const store = user.Store

    // Aggregate total earnings from paid orders (single query instead of loading all items)
    const totalEarningsResult = await prisma.order.aggregate({
      where: {
        OrderItem: { some: { storeId: store.id } },
        paymentStatus: 'PAID',
      },
      _sum: {
        sellerProductEarnings: true,
        sellerShippingAmount: true,
      },
      _count: true,
    })

    // Aggregate pending balance (not delivered, within 48h window)
    const pendingWindow = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const pendingResult = await prisma.order.aggregate({
      where: {
        OrderItem: { some: { storeId: store.id } },
        status: { not: 'DELIVERED' },
        createdAt: { gte: pendingWindow },
      },
      _sum: {
        sellerProductEarnings: true,
        sellerShippingAmount: true,
      },
    })

    const totalProductEarnings = toNum(totalEarningsResult._sum.sellerProductEarnings)
    const totalShippingEarnings = toNum(totalEarningsResult._sum.sellerShippingAmount)
    const totalOrders = totalEarningsResult._count
    const pendingBalance = toNum(pendingResult._sum.sellerProductEarnings) + toNum(pendingResult._sum.sellerShippingAmount)

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
