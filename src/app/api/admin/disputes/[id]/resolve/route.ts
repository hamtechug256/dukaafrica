/**
 * API: Resolve Dispute (Admin)
 *
 * POST /api/admin/disputes/[id]/resolve
 *
 * Resolves a dispute with one of the following outcomes:
 * - REFUND_BUYER: Full refund to buyer
 * - RELEASE_TO_SELLER: Release funds to seller
 * - PARTIAL_REFUND: Partial refund to buyer, rest to seller
 *
 * Updates escrow accordingly and creates notifications.
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { releaseEscrow, refundEscrow } from '@/lib/escrow'

// Valid resolution types
const VALID_RESOLUTIONS = [
  'REFUND_BUYER',
  'RELEASE_TO_SELLER',
  'PARTIAL_REFUND',
]

// Check admin access
async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    // Get dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        Order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            currency: true,
            userId: true,
            escrowStatus: true,
          },
        },
        Store: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Check if dispute is already resolved
    if (dispute.status === 'RESOLVED') {
      return NextResponse.json({ error: 'This dispute is already resolved' }, { status: 400 })
    }

    // Parse request body
    const body = await req.json()
    const { resolution, resolutionNotes, refundAmount } = body

    // Validate resolution type
    if (!resolution || !VALID_RESOLUTIONS.includes(resolution)) {
      return NextResponse.json({
        error: 'Invalid resolution type',
        validResolutions: VALID_RESOLUTIONS,
      }, { status: 400 })
    }

    // Validate resolution notes
    if (!resolutionNotes || resolutionNotes.trim().length < 10) {
      return NextResponse.json({
        error: 'Please provide resolution notes (at least 10 characters)',
      }, { status: 400 })
    }

    // Validate refund amount for partial refund
    if (resolution === 'PARTIAL_REFUND') {
      if (!refundAmount || refundAmount <= 0) {
        return NextResponse.json({
          error: 'Please specify a valid refund amount for partial refund',
        }, { status: 400 })
      }

      // Get escrow to check max refund amount
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { orderId: dispute.orderId },
      })

      if (escrow && refundAmount > escrow.sellerAmount) {
        return NextResponse.json({
          error: `Refund amount cannot exceed seller amount (${escrow.currency} ${escrow.sellerAmount.toLocaleString()})`,
        }, { status: 400 })
      }
    }

    // Process resolution
    const now = new Date()

    // Update dispute
    const updatedDispute = await prisma.dispute.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution,
        resolutionNotes: resolutionNotes.trim(),
        refundAmount: resolution === 'REFUND_BUYER'
          ? dispute.Order?.total
          : resolution === 'PARTIAL_REFUND'
            ? refundAmount
            : null,
        resolvedAt: now,
        resolvedBy: admin.id,
      },
    })

    // Update order status
    await prisma.order.update({
      where: { id: dispute.orderId },
      data: {
        status: resolution === 'RELEASE_TO_SELLER' ? 'DELIVERED' : 'CANCELLED',
      },
    })

    // Process escrow based on resolution
    let escrowResult: any = {}

    switch (resolution) {
      case 'REFUND_BUYER':
        // Full refund to buyer
        escrowResult = await refundEscrow({
          orderId: dispute.orderId,
          refundReason: `Dispute resolved: ${resolutionNotes}`,
          refundedBy: admin.id,
        })
        break

      case 'RELEASE_TO_SELLER':
        // Release funds to seller
        escrowResult = await releaseEscrow({
          orderId: dispute.orderId,
          releaseType: 'DISPUTE_RESOLVED',
          releasedBy: admin.id,
        })
        break

      case 'PARTIAL_REFUND':
        // Partial refund - refund part to buyer, rest to seller
        escrowResult = await refundEscrow({
          orderId: dispute.orderId,
          refundReason: `Dispute resolved (partial refund): ${resolutionNotes}`,
          refundedBy: admin.id,
          refundAmount,
        })
        break
    }

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: dispute.buyerId,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved',
        message: resolution === 'REFUND_BUYER'
          ? `Your dispute for order #${dispute.Order?.orderNumber} has been resolved. A full refund has been processed.`
          : resolution === 'PARTIAL_REFUND'
            ? `Your dispute for order #${dispute.Order?.orderNumber} has been resolved. A partial refund of ${dispute.Order?.currency} ${refundAmount?.toLocaleString()} has been processed.`
            : `Your dispute for order #${dispute.Order?.orderNumber} has been resolved. The decision was made in favor of the seller.`,
        data: JSON.stringify({
          disputeId: id,
          orderId: dispute.orderId,
          resolution,
          refundAmount: resolution === 'REFUND_BUYER'
            ? dispute.Order?.total
            : refundAmount,
        }),
      },
    })

    // Create notification for seller
    if (dispute.Store?.userId) {
      await prisma.notification.create({
        data: {
          userId: dispute.Store.userId,
          type: 'DISPUTE_RESOLVED',
          title: 'Dispute Resolved',
          message: resolution === 'REFUND_BUYER'
            ? `The dispute for order #${dispute.Order?.orderNumber} has been resolved. A refund has been issued to the buyer.`
            : resolution === 'PARTIAL_REFUND'
              ? `The dispute for order #${dispute.Order?.orderNumber} has been resolved. A partial refund of ${dispute.Order?.currency} ${refundAmount?.toLocaleString()} has been issued.`
              : `Great news! The dispute for order #${dispute.Order?.orderNumber} has been resolved in your favor. Funds have been released to your balance.`,
          data: JSON.stringify({
            disputeId: id,
            orderId: dispute.orderId,
            resolution,
          }),
        },
      })
    }

    // Add system message to dispute
    await prisma.disputeMessage.create({
      data: {
        disputeId: id,
        userId: admin.id,
        message: `Dispute resolved by admin. Resolution: ${resolution.replace(/_/g, ' ')}. ${resolutionNotes}`,
        isAdmin: true,
        isInternal: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Dispute resolved successfully',
      dispute: {
        id: updatedDispute.id,
        status: updatedDispute.status,
        resolution: updatedDispute.resolution,
        resolvedAt: updatedDispute.resolvedAt,
      },
      escrow: escrowResult,
    })
  } catch (error) {
    console.error('Error resolving dispute:', error)
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 })
  }
}
