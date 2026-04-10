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
import { pesapalClient } from '@/lib/pesapal/client'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

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

    // Get ALL escrow transactions (multi-vendor support — sum across all stores)
    const escrows = await prisma.escrowTransaction.findMany({
      where: { orderId },
    })

    // Calculate refund amount (convert Decimal to number for calculations)
    let finalRefundAmount: number

    if (refundType === 'FULL') {
      // Full refund: sum sellerAmount across ALL escrows (multi-vendor)
      if (escrows.length > 0) {
        finalRefundAmount = escrows.reduce((sum, e) => sum + toNum(e.sellerAmount), 0)
      } else {
        finalRefundAmount = refundShipping
          ? toNum(order.total)
          : toNum(order.subtotal)
      }
    } else {
      // Partial refund
      if (!refundAmount || refundAmount <= 0) {
        return NextResponse.json({
          error: 'Please specify a valid refund amount for partial refund',
        }, { status: 400 })
      }

      // Cap at total seller amount across ALL escrows
      const maxRefund = escrows.length > 0
        ? escrows.reduce((sum, e) => sum + toNum(e.sellerAmount), 0)
        : toNum(order.total)
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

    // Call Pesapal refund API to actually return money to buyer
    // This is critical — without this, the buyer never gets their money back
    let pesapalRefundResult: { success: boolean; message: string; refundStatus?: string | null } = {
      success: false,
      message: 'Pesapal refund not attempted',
    }

    const paymentRef = order.Payment?.[0]?.reference || order.Payment?.reference
    if (paymentRef) {
      try {
        const pesapalResponse = await pesapalClient.refundOrder({
          confirmation_code: paymentRef,
          amount: finalRefundAmount,
          remarks: `Refund for order #${order.orderNumber}: ${refundReason.trim()}`,
        })
        pesapalRefundResult = {
          success: pesapalResponse.status === '200' || pesapalResponse.refund_status !== null,
          message: pesapalResponse.message || pesapalResponse.error || 'Pesapal refund processed',
          refundStatus: pesapalResponse.refund_status,
        }
        console.log(`[Refund] Pesapal refund API response for ${order.orderNumber}:`, pesapalRefundResult)
      } catch (pesapalErr) {
        const errMsg = pesapalErr instanceof Error ? pesapalErr.message : 'Unknown Pesapal error'
        console.error(`[Refund] Pesapal refund API FAILED for ${order.orderNumber}:`, errMsg)
        pesapalRefundResult = {
          success: false,
          message: `Pesapal refund failed: ${errMsg}. Internal refund completed — manual Pesapal refund may be needed.`,
        }
      }
    } else {
      console.warn(`[Refund] No payment reference found for order ${order.orderNumber} — cannot call Pesapal refund API`)
      pesapalRefundResult = {
        success: false,
        message: 'No payment reference found — Pesapal refund skipped. Manual refund may be needed.',
      }
    }

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
      pesapalRefund: pesapalRefundResult,
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

    // Calculate refund details (EscrowTransaction is now an array for multi-vendor support)
    const escrows = Array.isArray(order.EscrowTransaction) ? order.EscrowTransaction : []
    const primaryEscrow = escrows[0] // First escrow for backward compatibility

    // Sum sellerAmount across ALL escrows for accurate maxRefundAmount
    const totalSellerAmount = escrows.length > 0
      ? escrows.reduce((sum, e) => sum + toNum(e.sellerAmount), 0)
      : toNum(order.total)

    const refundEligibility = {
      canRefund: order.paymentStatus === 'PAID' && order.escrowStatus !== 'REFUNDED',
      maxRefundAmount: totalSellerAmount,
      productTotal: toNum(order.subtotal),
      shippingFee: toNum(order.shippingFee),
      orderTotal: toNum(order.total),
      currency: order.currency,
      escrowStatus: order.escrowStatus,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      storeBalances: {
        escrow: toNum(order.Store?.escrowBalance),
        pending: toNum(order.Store?.pendingBalance),
        available: toNum(order.Store?.availableBalance),
      },
      escrowDetails: primaryEscrow ? {
        sellerAmount: toNum(primaryEscrow.sellerAmount),
        platformAmount: toNum(primaryEscrow.platformAmount),
        status: primaryEscrow.status,
        heldAt: primaryEscrow.heldAt,
      } : null,
      multiVendorEscrows: escrows.length > 1 ? escrows.map((e) => ({
        storeId: e.storeId,
        sellerAmount: toNum(e.sellerAmount),
        status: e.status,
      })) : null,
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
