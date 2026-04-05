/**
 * API: Create Dispute
 *
 * POST /api/orders/[id]/dispute
 *
 * Creates a dispute for an order (buyer only).
 * - Validates order belongs to buyer
 * - Checks order is paid and not already disputed
 * - Creates Dispute record
 * - Updates escrow status to DISPUTED
 * - Creates notification for seller
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { disputeEscrow } from '@/lib/escrow'

// Valid dispute reasons
const VALID_REASONS = [
  'NON_DELIVERY',
  'ITEM_NOT_AS_DESCRIBED',
  'DAMAGED',
  'WRONG_ITEM',
  'COUNTERFEIT',
  'PARTIAL_DELIVERY',
  'LATE_DELIVERY',
  'OTHER'
]

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id: orderId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get order with store info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        Store: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
        Dispute: true,
        OrderItem: {
          select: {
            productName: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify user is the buyer
    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can create a dispute' }, { status: 403 })
    }

    // Check if order is paid
    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: 'Only paid orders can be disputed' }, { status: 400 })
    }

    // Check if order is already disputed
    if (order.Dispute) {
      return NextResponse.json({ error: 'This order already has a dispute' }, { status: 400 })
    }

    // Check if order is cancelled or refunded
    if (order.status === 'CANCELLED' || order.escrowStatus === 'REFUNDED') {
      return NextResponse.json({ error: 'Cannot dispute a cancelled or refunded order' }, { status: 400 })
    }

    // Parse request body
    const body = await req.json()
    const { reason, description, evidence } = body

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({
        error: 'Invalid dispute reason',
        validReasons: VALID_REASONS,
      }, { status: 400 })
    }

    // Validate description
    if (!description || description.trim().length < 20) {
      return NextResponse.json({
        error: 'Please provide a detailed description (at least 20 characters)',
      }, { status: 400 })
    }

    // Get escrow settings for dispute deadline
    const settings = await prisma.escrowSettings.findFirst()
    const disputeResolutionDays = settings?.disputeResolutionDays || 7

    // Calculate seller response deadline
    const sellerResponseDeadline = new Date()
    sellerResponseDeadline.setDate(sellerResponseDeadline.getDate() + 3) // 3 days to respond

    // Calculate auto-resolve date
    const autoResolveAt = new Date()
    autoResolveAt.setDate(autoResolveAt.getDate() + disputeResolutionDays)

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        storeId: order.storeId!,
        buyerId: user.id,
        sellerId: order.Store?.userId || '',
        reason,
        description: description.trim(),
        buyerEvidence: evidence ? JSON.stringify(evidence) : null,
        status: 'OPEN',
        sellerResponseDeadline,
        autoResolveAt,
      },
    })

    // Update escrow status to DISPUTED
    await disputeEscrow({
      orderId,
      reason,
    })

    // Create notification for seller
    if (order.Store?.userId) {
      await prisma.notification.create({
        data: {
          userId: order.Store.userId,
          type: 'DISPUTE_OPENED',
          title: 'Dispute Opened on Your Order',
          message: `A dispute has been opened for order #${order.orderNumber}. Reason: ${reason.replace(/_/g, ' ')}. Please respond within 3 days.`,
          data: JSON.stringify({
            disputeId: dispute.id,
            orderId,
            orderNumber: order.orderNumber,
            reason,
          }),
        },
      })
    }

    // Create notification for admin
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: { id: true },
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'DISPUTE_OPENED',
          title: 'New Dispute Requires Review',
          message: `A new dispute has been opened for order #${order.orderNumber}. Reason: ${reason.replace(/_/g, ' ')}`,
          data: JSON.stringify({
            disputeId: dispute.id,
            orderId,
            reason,
          }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Dispute created successfully',
      dispute: {
        id: dispute.id,
        reason: dispute.reason,
        status: dispute.status,
        createdAt: dispute.createdAt,
        sellerResponseDeadline: dispute.sellerResponseDeadline,
      },
    })
  } catch (error) {
    console.error('Error creating dispute:', error)
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
  }
}
