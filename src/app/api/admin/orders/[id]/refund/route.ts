/**
 * API: Process Refund (Admin)
 *
 * POST /api/admin/orders/[id]/refund
 *
 * Processes a refund for an order.
 * - Supports full or partial refunds
 * - Updates escrow status
 * - Updates store balances
 * - Creates notifications for both buyer and seller
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { refundEscrow } from '@/lib/escrow'

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

    const { id: orderId } = await params

    // Get order with related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        Store: {
          select: {
            id: true,
            name: true,
            userId: true,
            escrowBalance: true,
            pendingBalance: true,
            availableBalance: true,
          },
        },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Payment: true,
        OrderItem: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            price: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is paid
    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: 'Only paid orders can be refunded' }, { status: 400 })
    }

    // Check if order is already refunded
    if (order.escrowStatus === 'REFUNDED') {
      return NextResponse.json({ error: 'This order has already been fully refunded' }, { status: 400 })
    }

    // Check if order is cancelled
    if (order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot refund a cancelled order' }, { status: 400 })
    }

    // Parse request body
    const body = await req.json()
    const {
      refundType, // 'FULL' or 'PARTIAL'
      refundAmount,
      refundReason,
      refundShipping, // Whether to refund shipping fee
      notifyUsers = true,
    } = body

    // Validate refund type
    if (!refundType || !['FULL', 'PARTIAL'].includes(refundType)) {
      return NextResponse.json({
        error: 'Invalid refund type',
        validTypes: ['FULL', 'PARTIAL'],
      }, { status: 400 })
    }

    // Validate refund reason
    if (!refundReason || refundReason.trim().length < 5) {
      return NextResponse.json({
        error: 'Please provide a reason for the refund',
      }, { status: 400 })
    }

    // Get escrow transaction
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { orderId },
    })

    // Calculate refund amount
    let finalRefundAmount: number

    if (refundType === 'FULL') {
      // Full refund includes product amount + shipping
      finalRefundAmount = refundShipping
        ? order.total
        : order.subtotal

      // For escrow, we refund seller's portion
      if (escrow) {
        finalRefundAmount = escrow.sellerAmount
      }
    } else {
      // Partial refund
      if (!refundAmount || refundAmount <= 0) {
        return NextResponse.json({
          error: 'Please specify a valid refund amount for partial refund',
        }, { status: 400 })
      }

      // Cap at seller's amount or order total
      const maxRefund = escrow?.sellerAmount || order.total
      if (refundAmount > maxRefund) {
        return NextResponse.json({
          error: `Refund amount cannot exceed ${order.currency} ${maxRefund.toLocaleString()}`,
        }, { status: 400 })
      }

      finalRefundAmount = refundAmount
    }

    // Process refund through escrow
    const escrowResult = await refundEscrow({
      orderId,
      refundReason: refundReason.trim(),
      refundedBy: admin.id,
      refundAmount: finalRefundAmount,
    })

    if (!escrowResult.success) {
      return NextResponse.json({
        error: escrowResult.error || 'Failed to process refund',
      }, { status: 500 })
    }

    // Create refund record
    const refundRecord = await prisma.payment.update({
      where: { orderId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    })

    // Create notification for buyer
    if (notifyUsers && order.User) {
      await prisma.notification.create({
        data: {
          userId: order.User.id,
          type: 'REFUND_PROCESSED',
          title: 'Refund Processed',
          message: `Your refund of ${order.currency} ${finalRefundAmount.toLocaleString()} for order #${order.orderNumber} has been processed. Reason: ${refundReason}`,
          data: JSON.stringify({
            orderId,
            orderNumber: order.orderNumber,
            refundAmount: finalRefundAmount,
            refundReason,
          }),
        },
      })
    }

    // Create notification for seller
    if (notifyUsers && order.Store?.userId) {
      await prisma.notification.create({
        data: {
          userId: order.Store.userId,
          type: 'ORDER_REFUNDED',
          title: 'Order Refunded',
          message: `Order #${order.orderNumber} has been refunded. Amount: ${order.currency} ${finalRefundAmount.toLocaleString()}. Reason: ${refundReason}`,
          data: JSON.stringify({
            orderId,
            orderNumber: order.orderNumber,
            refundAmount: finalRefundAmount,
            refundReason,
          }),
        },
      })
    }

    // Log the refund for audit
    console.log(`[Refund] Admin ${admin.id} processed refund for order ${order.orderNumber}:`, {
      refundType,
      refundAmount: finalRefundAmount,
      currency: order.currency,
      reason: refundReason,
    })

    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        orderId,
        orderNumber: order.orderNumber,
        refundType,
        refundAmount: finalRefundAmount,
        currency: order.currency,
        refundReason,
        processedAt: new Date(),
        processedBy: admin.id,
      },
    })
  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}

/**
 * GET /api/admin/orders/[id]/refund
 *
 * Get refund eligibility and details for an order
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: orderId } = await params

    // Get order with related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        Store: {
          select: {
            id: true,
            name: true,
            escrowBalance: true,
            pendingBalance: true,
            availableBalance: true,
          },
        },
        Payment: true,
        EscrowTransaction: true,
        OrderItem: {
          select: {
            productName: true,
            quantity: true,
            price: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Calculate refund details
    const escrow = order.EscrowTransaction

    const refundEligibility = {
      canRefund: order.paymentStatus === 'PAID' && order.escrowStatus !== 'REFUNDED',
      maxRefundAmount: escrow?.sellerAmount || order.total,
      productTotal: order.subtotal,
      shippingFee: order.shippingFee,
      orderTotal: order.total,
      currency: order.currency,
      escrowStatus: order.escrowStatus,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      storeBalances: {
        escrow: order.Store?.escrowBalance || 0,
        pending: order.Store?.pendingBalance || 0,
        available: order.Store?.availableBalance || 0,
      },
      escrowDetails: escrow ? {
        sellerAmount: escrow.sellerAmount,
        platformAmount: escrow.platformAmount,
        status: escrow.status,
        heldAt: escrow.heldAt,
      } : null,
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        escrowStatus: order.escrowStatus,
        createdAt: order.createdAt,
      },
      refundEligibility,
    })
  } catch (error) {
    console.error('Error checking refund eligibility:', error)
    return NextResponse.json({ error: 'Failed to check refund eligibility' }, { status: 500 })
  }
}
