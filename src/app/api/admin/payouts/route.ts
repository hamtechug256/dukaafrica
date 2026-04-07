/**
 * API: Admin Payout Queue
 *
 * GET /api/admin/payouts?status=PENDING|PROCESSING|COMPLETED|FAILED
 *
 * Returns all seller payouts filtered by status, sorted by createdAt ASC.
 * Only accessible by ADMIN or SUPER_ADMIN users.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SAFETY GUARD 1: Require admin authentication
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'PENDING'

    if (!VALID_STATUSES.includes(statusFilter)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const payouts = await prisma.sellerPayout.findMany({
      where: { status: statusFilter },
      include: {
        Store: {
          include: {
            User: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const formatted = payouts.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      amount: toNum(p.amount),
      currency: p.currency,
      status: p.status,
      method: p.method,
      reference: p.reference,
      processedAt: p.processedAt,
      // Seller & store info
      sellerName: p.Store.User.name || p.Store.User.email || 'Unknown',
      sellerEmail: p.Store.User.email,
      sellerPhone: p.Store.User.phone,
      storeName: p.Store.name,
      storeId: p.Store.id,
      // Payout destination details
      payoutPhone: p.Store.payoutPhone || null,
      payoutMobileProvider: p.Store.payoutMobileProvider || null,
      payoutBankName: p.Store.payoutBankName || null,
      payoutBankCode: p.Store.payoutBankCode || null,
      payoutBankAccount: p.Store.payoutBankAccount || null,
      accountInfo: p.accountInfo || '',
    }))

    // Summary counts
    const summary = {
      pending: await prisma.sellerPayout.count({ where: { status: 'PENDING' } }),
      processing: await prisma.sellerPayout.count({ where: { status: 'PROCESSING' } }),
      completed: await prisma.sellerPayout.count({ where: { status: 'COMPLETED' } }),
      failed: await prisma.sellerPayout.count({ where: { status: 'FAILED' } }),
    }

    return NextResponse.json({
      payouts: formatted,
      summary,
      status: statusFilter,
    })
  } catch (error) {
    console.error('Error fetching admin payouts:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}
