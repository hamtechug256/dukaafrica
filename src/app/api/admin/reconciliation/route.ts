/**
 * API: Admin Financial Reconciliation
 *
 * GET /api/admin/reconciliation
 *
 * Returns a financial summary for the platform, grouped by currency.
 * Only accessible by ADMIN or SUPER_ADMIN users.
 *
 * Metrics:
 * - totalPaymentsReceived: Sum of all PAID payment amounts (grouped by currency)
 * - totalPlatformEarnings: Sum of all platformAmount from PAID payments (grouped by currency)
 * - totalSentToSellers: Sum of all COMPLETED payouts (grouped by currency)
 * - pendingPayouts: Sum of all PENDING payouts (grouped by currency)
 * - failedPayouts: Sum of all FAILED payouts (grouped by currency)
 * - expectedBankBalance: totalPlatformEarnings - pendingPayouts (simplified, per currency)
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

const SUPPORTED_CURRENCIES = ['UGX', 'KES', 'TZS', 'RWF']

interface CurrencySummary {
  totalPaymentsReceived: number
  totalPlatformEarnings: number
  totalSentToSellers: number
  pendingPayouts: number
  failedPayouts: number
  expectedBankBalance: number
}

interface ReconciliationResult {
  byCurrency: Record<string, CurrencySummary>
  totals: CurrencySummary
  counts: {
    totalPaidPayments: number
    totalCompletedPayouts: number
    totalPendingPayouts: number
    totalFailedPayouts: number
  }
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Require admin authentication
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch all PAID payments grouped by currency
    const paymentsByCurrency = await prisma.payment.groupBy({
      by: ['currency'],
      where: { status: 'PAID' },
      _sum: {
        amount: true,
        platformAmount: true,
      },
      _count: true,
    })

    // Fetch all COMPLETED payouts grouped by currency
    const completedPayoutsByCurrency = await prisma.sellerPayout.groupBy({
      by: ['currency'],
      where: { status: 'COMPLETED' },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // Fetch all PENDING payouts grouped by currency
    const pendingPayoutsByCurrency = await prisma.sellerPayout.groupBy({
      by: ['currency'],
      where: { status: 'PENDING' },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // Fetch all FAILED payouts grouped by currency
    const failedPayoutsByCurrency = await prisma.sellerPayout.groupBy({
      by: ['currency'],
      where: { status: 'FAILED' },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // Helper to get sum from a group result by currency
    const getGroupSum = (
      groups: Array<{ currency: string; _sum: { amount?: Prisma.Decimal | null } }>,
      currency: string,
      field: 'amount' | 'platformAmount' = 'amount'
    ): number => {
      const group = groups.find((g) => g.currency === currency)
      if (!group) return 0
      return toNum((group._sum as Record<string, unknown>)[field])
    }

    // Helper to get platform amount sum from payments group
    const getPaymentPlatformSum = (
      groups: Array<{ currency: string; _sum: { amount?: Prisma.Decimal | null; platformAmount?: Prisma.Decimal | null } }>,
      currency: string
    ): number => {
      const group = groups.find((g) => g.currency === currency)
      if (!group) return 0
      return toNum(group._sum.platformAmount)
    }

    // Helper to get count from a group result by currency
    const getGroupCount = (
      groups: Array<{ currency: string; _count: boolean | number }>,
      currency: string
    ): number => {
      const group = groups.find((g) => g.currency === currency)
      if (!group) return 0
      return typeof group._count === 'number' ? group._count : 1
    }

    const byCurrency: Record<string, CurrencySummary> = {}
    const totals: CurrencySummary = {
      totalPaymentsReceived: 0,
      totalPlatformEarnings: 0,
      totalSentToSellers: 0,
      pendingPayouts: 0,
      failedPayouts: 0,
      expectedBankBalance: 0,
    }

    const counts = {
      totalPaidPayments: 0,
      totalCompletedPayouts: 0,
      totalPendingPayouts: 0,
      totalFailedPayouts: 0,
    }

    // Count total across all currencies
    for (const g of paymentsByCurrency) {
      counts.totalPaidPayments += typeof g._count === 'number' ? g._count : 1
    }
    for (const g of completedPayoutsByCurrency) {
      counts.totalCompletedPayouts += typeof g._count === 'number' ? g._count : 1
    }
    for (const g of pendingPayoutsByCurrency) {
      counts.totalPendingPayouts += typeof g._count === 'number' ? g._count : 1
    }
    for (const g of failedPayoutsByCurrency) {
      counts.totalFailedPayouts += typeof g._count === 'number' ? g._count : 1
    }

    // Build per-currency summary
    for (const currency of SUPPORTED_CURRENCIES) {
      const totalPaymentsReceived = getGroupSum(paymentsByCurrency, currency)
      const totalPlatformEarnings = getPaymentPlatformSum(paymentsByCurrency, currency)
      const totalSentToSellers = getGroupSum(completedPayoutsByCurrency, currency)
      const pendingPayouts = getGroupSum(pendingPayoutsByCurrency, currency)
      const failedPayouts = getGroupSum(failedPayoutsByCurrency, currency)
      const expectedBankBalance = totalPlatformEarnings - pendingPayouts

      byCurrency[currency] = {
        totalPaymentsReceived,
        totalPlatformEarnings,
        totalSentToSellers,
        pendingPayouts,
        failedPayouts,
        expectedBankBalance,
      }

      // Accumulate totals
      totals.totalPaymentsReceived += totalPaymentsReceived
      totals.totalPlatformEarnings += totalPlatformEarnings
      totals.totalSentToSellers += totalSentToSellers
      totals.pendingPayouts += pendingPayouts
      totals.failedPayouts += failedPayouts
      totals.expectedBankBalance += expectedBankBalance
    }

    // Also include any currencies that exist in the DB but aren't in our supported list
    const allCurrencies = new Set<string>(SUPPORTED_CURRENCIES)
    for (const g of paymentsByCurrency) allCurrencies.add(g.currency)
    for (const g of completedPayoutsByCurrency) allCurrencies.add(g.currency)
    for (const g of pendingPayoutsByCurrency) allCurrencies.add(g.currency)
    for (const g of failedPayoutsByCurrency) allCurrencies.add(g.currency)

    for (const currency of allCurrencies) {
      if (SUPPORTED_CURRENCIES.includes(currency)) continue // Already computed

      const totalPaymentsReceived = getGroupSum(paymentsByCurrency, currency)
      const totalPlatformEarnings = getPaymentPlatformSum(paymentsByCurrency, currency)
      const totalSentToSellers = getGroupSum(completedPayoutsByCurrency, currency)
      const pendingPayouts = getGroupSum(pendingPayoutsByCurrency, currency)
      const failedPayouts = getGroupSum(failedPayoutsByCurrency, currency)
      const expectedBankBalance = totalPlatformEarnings - pendingPayouts

      byCurrency[currency] = {
        totalPaymentsReceived,
        totalPlatformEarnings,
        totalSentToSellers,
        pendingPayouts,
        failedPayouts,
        expectedBankBalance,
      }
    }

    const result: ReconciliationResult = { byCurrency, totals, counts }

    return NextResponse.json({
      success: true,
      reconciliation: result,
    })
  } catch (error) {
    console.error('Error generating reconciliation:', error)
    return NextResponse.json({ error: 'Failed to generate reconciliation report' }, { status: 500 })
  }
}
