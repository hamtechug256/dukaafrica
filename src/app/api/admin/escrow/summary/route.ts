/**
 * API: Get Escrow Summary
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true }
    })
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

// Default summary when tables don't exist
function getDefaultSummary() {
  return {
    totalHeld: 0,
    totalReleased: 0,
    totalRefunded: 0,
    totalDisputed: 0,
    heldTransactions: 0,
    avgHoldDays: 5
  }
}

export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // Try to get escrow transactions
    let transactions: any[] = []
    try {
      transactions = await prisma.escrowTransaction.findMany()
    } catch {
      // Table doesn't exist yet
      return NextResponse.json(getDefaultSummary())
    }

    let totalHeld = 0
    let totalReleased = 0
    let totalRefunded = 0
    let totalDisputed = 0
    let heldTransactions = 0

    for (const tx of transactions) {
      switch (tx.status) {
        case 'HELD':
          totalHeld += tx.sellerAmount || 0
          heldTransactions++
          break
        case 'RELEASED':
          totalReleased += tx.sellerAmount || 0
          break
        case 'REFUNDED':
        case 'PARTIAL_REFUND':
          totalRefunded += tx.refundAmount || 0
          break
        case 'DISPUTED':
          totalDisputed += tx.sellerAmount || 0
          break
      }
    }

    return NextResponse.json({
      totalHeld,
      totalReleased,
      totalRefunded,
      totalDisputed,
      heldTransactions,
      avgHoldDays: 5
    })
  } catch (error) {
    console.error('Error fetching escrow summary:', error)
    return NextResponse.json(getDefaultSummary())
  }
}
