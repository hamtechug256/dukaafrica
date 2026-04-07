/**
 * API: Admin Process Payout
 *
 * POST /api/admin/payouts/[id]/process
 *
 * Body: { action: 'complete' | 'fail', confirmationAmount: number }
 *
 * SAFETY GUARD 1: Requires admin authentication
 * SAFETY GUARD 2: confirmationAmount must EXACTLY match payout.amount
 *
 * - complete: Marks payout as COMPLETED (no balance change — already deducted at withdrawal)
 * - fail: Marks payout as FAILED and RESTORES the seller's availableBalance
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

interface ProcessRequestBody {
  action: 'complete' | 'fail'
  confirmationAmount: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SAFETY GUARD 1: Require admin authentication
    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { id: payoutId } = await params

    if (!payoutId) {
      return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 })
    }

    // Fetch the payout with store info
    const payout = await prisma.sellerPayout.findUnique({
      where: { id: payoutId },
      include: {
        Store: {
          select: { id: true, name: true, availableBalance: true },
        },
      },
    })

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    // Only allow processing of PENDING payouts
    if (payout.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot process a payout with status "${payout.status}". Only PENDING payouts can be processed.` },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body: ProcessRequestBody = await request.json()
    const { action, confirmationAmount } = body

    if (!action || !['complete', 'fail'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "complete" or "fail".' },
        { status: 400 }
      )
    }

    const payoutAmount = toNum(payout.amount)

    // SAFETY GUARD 2: Amount confirmation
    if (typeof confirmationAmount !== 'number' || confirmationAmount !== payoutAmount) {
      return NextResponse.json(
        {
          error: `Amount mismatch. You must type ${payoutAmount} to confirm.`,
          expectedAmount: payoutAmount,
          receivedAmount: confirmationAmount,
        },
        { status: 400 }
      )
    }

    if (action === 'complete') {
      // Mark as COMPLETED — no balance change (already decremented at withdrawal request)
      const updatedPayout = await prisma.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: `Payout of ${payout.currency} ${payoutAmount.toLocaleString()} marked as COMPLETED.`,
        payout: {
          id: updatedPayout.id,
          status: updatedPayout.status,
          processedAt: updatedPayout.processedAt,
          storeName: payout.Store.name,
        },
      })
    }

    if (action === 'fail') {
      // Mark as FAILED and RESTORE the balance (safety net)
      const updatedPayout = await prisma.$transaction(async (tx) => {
        // Update payout status
        const updated = await tx.sellerPayout.update({
          where: { id: payoutId },
          data: {
            status: 'FAILED',
            processedAt: new Date(),
          },
        })

        // RESTORE the balance: increment store.availableBalance by payout.amount
        await tx.store.update({
          where: { id: payout.storeId },
          data: {
            availableBalance: { increment: payoutAmount },
          },
        })

        return updated
      })

      return NextResponse.json({
        success: true,
        message: `Payout FAILED. Balance of ${payout.currency} ${payoutAmount.toLocaleString()} restored to seller.`,
        payout: {
          id: updatedPayout.id,
          status: updatedPayout.status,
          processedAt: updatedPayout.processedAt,
          storeName: payout.Store.name,
          restoredAmount: payoutAmount,
          currency: payout.currency,
        },
      })
    }

    // Should not reach here
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing payout:', error)
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 })
  }
}
