/**
 * API: Pesapal IPN (Instant Payment Notification) Handler
 *
 * POST /api/pesapal/ipn
 *
 * Receives payment status notifications from Pesapal.
 * Handles payment confirmation, escrow creation, and order updates.
 * Mirrors the Paystack webhook logic for consistency.
 *
 * Pesapal IPN payload (JSON):
 * {
 *   "notification_type": "IPN",
 *   "merchant_reference": "...",
 *   "order_tracking_id": "...",
 *   "order_notification_type": "...",
 *   "order_merchant_reference": "...",
 *   "order_amount": "...",
 *   "order_currency": "...",
 *   "order_status": "COMPLETED" | "FAILED" | "CANCELLED" | ...
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createEscrowHold } from '@/lib/escrow'
import { pesapalClient } from '@/lib/pesapal/client'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('Pesapal IPN received:', {
      notificationType: payload.notification_type,
      orderTrackingId: payload.order_tracking_id,
      orderStatus: payload.order_status,
    })

    // Acknowledge receipt immediately — Pesapal expects 200 OK
    // Process asynchronously to avoid timeout
    processPesapalIPN(payload).catch((err) => {
      console.error('Pesapal IPN processing error (async):', err)
    })

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Pesapal IPN handler error:', error)
    // Still return 200 to prevent Pesapal from retrying on parse errors
    return NextResponse.json({ received: true })
  }
}

// ============================================================
// IPN PROCESSING
// ============================================================

interface PesapalIPNPayload {
  notification_type: string
  merchant_reference: string
  order_tracking_id: string
  order_notification_type: string
  order_merchant_reference: string
  order_amount: string
  order_currency: string
  order_status: string
  [key: string]: unknown
}

async function processPesapalIPN(payload: PesapalIPNPayload) {
  const { order_status, order_tracking_id } = payload

  if (order_status === 'COMPLETED') {
    await handleCompletedPayment(order_tracking_id, payload)
  } else if (order_status === 'FAILED') {
    await handleFailedPayment(order_tracking_id, payload)
  } else if (order_status === 'CANCELLED') {
    await handleCancelledPayment(order_tracking_id, payload)
  } else if (order_status === 'REVERSED') {
    await handleReversedPayment(order_tracking_id, payload)
  } else {
    console.log(`Pesapal IPN — unhandled status "${order_status}" for ${order_tracking_id}`)
  }
}

// ============================================================
// COMPLETED PAYMENT
// ============================================================

async function handleCompletedPayment(orderTrackingId: string, payload: PesapalIPNPayload) {
  // SECURITY: Re-verify payment status directly from Pesapal API
  // Don't trust the IPN payload alone — confirm with Pesapal's status endpoint
  try {
    const pesapalStatus = await pesapalClient.getTransactionStatus(orderTrackingId)
    if (pesapalStatus.transaction_status !== 'COMPLETED') {
      console.warn(`Pesapal IPN verification failed: status is "${pesapalStatus.transaction_status}", not COMPLETED. Skipping.`)
      return
    }
  } catch (err) {
    console.error('Pesapal status re-verification failed:', err)
    return
  }

  // Find the payment record by reference (the order tracking ID)
  const payment = await prisma.payment.findFirst({
    where: { reference: orderTrackingId },
    include: {
      Order: {
        include: {
          OrderItem: true,
          User: true,
        },
      },
    },
  })

  if (!payment || !payment.Order) {
    console.error(`Payment not found for order tracking ID: ${orderTrackingId}`)
    return
  }

  const order = payment.Order

  // Check idempotency — atomically update only if not already PAID
  const { count: paymentUpdated } = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: 'PAID' } },
    data: {
      status: 'PAID',
      providerRef: payload.order_tracking_id,
      paidAt: new Date(),
      providerResponse: JSON.stringify(payload),
    },
  })
  if (paymentUpdated === 0) {
    console.log('Payment already processed (atomic):', orderTrackingId)
    return
  }

  // Group items by store for processing
  const storeTotals = new Map<string, number>()

  for (const item of order.OrderItem) {
    const existing = storeTotals.get(item.storeId) || 0
    storeTotals.set(item.storeId, existing + toNum(item.total))
  }

  // ── ATOMIC CORE ──────────────────────────────────────────────────────────
  // Payment confirmation, order status, product quantities, and store totalSales
  // are all updated in a single transaction. If any step fails, everything
  // rolls back so we never end up in an inconsistent state.
  await prisma.$transaction(async (tx) => {
    // 1. Payment status was already updated atomically above

    // 2. Update order status
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
    })

    // 3. Per-store: increment purchaseCount (stock already reserved at order creation)
    for (const [storeId, storeTotal] of storeTotals) {
      const storeItems = order.OrderItem.filter(item => item.storeId === storeId)

      for (const item of storeItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            purchaseCount: { increment: item.quantity },
          },
        })
      }

      await tx.store.update({
        where: { id: storeId },
        data: {
          totalSales: { increment: storeTotal },
        },
      })
    }
  })
  // ── END ATOMIC CORE ──────────────────────────────────────────────────────

  // ── COUPON USAGE INCREMENT (moved from create-order) ────────────────────
  // Only increment coupon usage when payment is confirmed, not at order creation.
  // This prevents wasting coupon slots on unpaid/uncompleted orders.
  if (order.couponId) {
    try {
      await prisma.coupon.update({
        where: { id: order.couponId },
        data: { usageCount: { increment: 1 } },
      })
      console.log(`Coupon ${order.couponId} usage incremented for order ${order.orderNumber}`)
    } catch (couponErr) {
      console.error(`Failed to increment coupon usage for ${order.couponId}:`, couponErr)
      // Non-fatal: coupon tracking error should not break payment processing
    }
  }

  // ── ESCROW CREATION (non-atomic, non-fatal) ──────────────────────────────
  for (const [storeId, storeTotal] of storeTotals) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        userId: true,
        verificationTier: true,
        verificationStatus: true,
        commissionRate: true,
        country: true,
      },
    })

    if (!store) {
      console.error('Store not found:', storeId)
      continue
    }

    // Calculate this store's proportion of the total product subtotal
    // to determine their share of shipping earnings
    const totalProductSubtotal = order.subtotal ? toNum(order.subtotal) : storeTotal
    const storeProductShare = totalProductSubtotal > 0 ? storeTotal / totalProductSubtotal : 1

    // Get seller's shipping earnings from the Payment record
    // Payment.sellerAmount includes product + shipping earnings
    // sellerTotalEarnings = sellerProductEarnings + sellerShippingEarnings
    const sellerTotalEarnings = toNum(payment.sellerAmount)
    const platformCommission = toNum(payment.platformAmount)
    
    // Estimate seller shipping earnings proportionally
    // Platform keeps: commission (on product) + shipping markup (configurable %)
    // Seller gets: product after commission + shipping after markup
    const orderShippingFee = toNum(order.shippingFee) || 0

    // Read shipping markup from PlatformSettings (default 5%)
    const platformSettings = await prisma.platformSettings.findFirst({
      select: { shippingMarkupPercent: true },
    })
    const shippingMarkup = platformSettings
      ? toNum(platformSettings.shippingMarkupPercent)
      : 5
    const sellerShippingShare = (100 - shippingMarkup) / 100
    const sellerShippingEarnings = Math.round(orderShippingFee * sellerShippingShare * storeProductShare)

    const escrowResult = await createEscrowHold({
      orderId: order.id,
      storeId: store.id,
      buyerId: order.userId,
      grossAmount: storeTotal,
      shippingEarnings: sellerShippingEarnings,
      currency: order.currency,
      store: {
        verificationTier: store.verificationTier,
        verificationStatus: store.verificationStatus,
        commissionRate: toNum(store.commissionRate),
      },
    })

    if (escrowResult.success) {
      console.log(`Escrow created for store ${storeId}:`, escrowResult.escrowId)
    } else {
      console.error(`Failed to create escrow for store ${storeId}:`, escrowResult.error)
      // Fallback: update escrowBalance without escrow record
      const commissionRate = toNum(store.commissionRate) || 15
      const sellerAmount = Math.round(storeTotal * (1 - commissionRate / 100))
      await prisma.store.update({
        where: { id: storeId },
        data: {
          escrowBalance: { increment: sellerAmount },
        },
      })
    }
  }

  console.log(`Payment ${orderTrackingId} processed successfully for order ${order.orderNumber}`)
}

// ============================================================
// FAILED PAYMENT
// ============================================================

async function handleFailedPayment(orderTrackingId: string, payload: PesapalIPNPayload) {
  const payment = await prisma.payment.findFirst({
    where: { reference: orderTrackingId },
  })

  if (!payment) {
    console.error(`Payment not found for failed tracking ID: ${orderTrackingId}`)
    return
  }

  // Atomic idempotency guard: only update if not already FAILED
  const { count: paymentUpdated } = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: 'FAILED' } },
    data: {
      status: 'FAILED',
      providerResponse: JSON.stringify(payload),
    },
  })
  if (paymentUpdated === 0) {
    console.log('Payment already marked as failed:', orderTrackingId)
    return
  }

  // Update order payment status
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: 'FAILED',
      status: 'CANCELLED',
    },
  })

  // Restore reserved stock (stock was decremented at order creation)
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: payment.orderId },
    select: { productId: true, variantId: true, quantity: true },
  })
  for (const item of orderItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: item.quantity } },
    })
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { quantity: { increment: item.quantity } },
      })
    }
  }

  console.log(`Payment ${orderTrackingId} marked as FAILED, stock restored`)
}

// ============================================================
// CANCELLED PAYMENT
// ============================================================

async function handleCancelledPayment(orderTrackingId: string, payload: PesapalIPNPayload) {
  const payment = await prisma.payment.findFirst({
    where: { reference: orderTrackingId },
  })

  if (!payment) {
    console.error(`Payment not found for cancelled tracking ID: ${orderTrackingId}`)
    return
  }

  // Atomic idempotency guard: only update if not already CANCELLED
  const { count: paymentUpdated } = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: 'CANCELLED' } },
    data: {
      status: 'CANCELLED',
      providerResponse: JSON.stringify(payload),
    },
  })
  if (paymentUpdated === 0) {
    console.log('Payment already marked as cancelled:', orderTrackingId)
    return
  }

  // Update order payment status
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: 'CANCELLED',
      status: 'CANCELLED',
    },
  })

  // Restore reserved stock (stock was decremented at order creation)
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: payment.orderId },
    select: { productId: true, variantId: true, quantity: true },
  })
  for (const item of orderItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: item.quantity } },
    })
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { quantity: { increment: item.quantity } },
      })
    }
  }

  console.log(`Payment ${orderTrackingId} marked as CANCELLED, stock restored`)
}

// ============================================================
// REVERSED PAYMENT (Chargeback)
// ============================================================

async function handleReversedPayment(orderTrackingId: string, payload: PesapalIPNPayload) {
  // Verify with Pesapal API first
  try {
    const pesapalStatus = await pesapalClient.getTransactionStatus(orderTrackingId)
    if (pesapalStatus.transaction_status !== 'REVERSED') {
      console.warn(`Pesapal IPN verification: status is "${pesapalStatus.transaction_status}", not REVERSED. Skipping.`)
      return
    }
  } catch (err) {
    console.error('Pesapal status re-verification failed for REVERSED:', err)
    return
  }

  const payment = await prisma.payment.findFirst({
    where: { reference: orderTrackingId },
    include: {
      Order: {
        include: {
          User: { select: { id: true } },
          OrderItem: { select: { productId: true, variantId: true, quantity: true, storeId: true } },
          Store: { select: { id: true, userId: true } },
        },
      },
    },
  })

  if (!payment || !payment.Order) {
    console.error(`Payment not found for reversed tracking ID: ${orderTrackingId}`)
    return
  }

  const order = payment.Order

  // Atomic idempotency guard: only process if not already reversed
  const { count: paymentUpdated } = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: 'REVERSED' } },
    data: {
      status: 'REVERSED',
      providerResponse: JSON.stringify(payload),
    },
  })
  if (paymentUpdated === 0) {
    console.log('Payment already marked as REVERSED:', orderTrackingId)
    return
  }

  // Update order status to DISPUTED (requires admin investigation)
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: 'REVERSED',
      status: 'DISPUTED',
    },
  })

  // If escrow was HELD, mark it as DISPUTED too
  if (order.escrowStatus === 'HELD') {
    await prisma.escrowTransaction.updateMany({
      where: { orderId: payment.orderId, status: 'HELD' },
      data: { status: 'DISPUTED' },
    })
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { escrowStatus: 'DISPUTED' },
    })
  }

  // Restore reserved stock (stock was decremented at order creation)
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: payment.orderId },
    select: { productId: true, variantId: true, quantity: true },
  })
  for (const item of orderItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: item.quantity } },
    })
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { quantity: { increment: item.quantity } },
      })
    }
  }

  // Notify buyer
  if (order.User) {
    await prisma.notification.create({
      data: {
        userId: order.User.id,
        type: 'DISPUTE',
        title: 'Payment Reversed',
        message: `A reversal has been initiated on your payment for order #${order.orderNumber}. Our team will investigate this matter.`,
        data: JSON.stringify({ orderId: order.id, orderNumber: order.orderNumber, reason: 'PAYMENT_REVERSED' }),
      },
    })
  }

  // Notify seller
  if (order.Store?.userId) {
    await prisma.notification.create({
      data: {
        userId: order.Store.userId,
        type: 'DISPUTE',
        title: 'Payment Reversed',
        message: `A payment reversal has been initiated for order #${order.orderNumber}. Escrow funds have been flagged for review.`,
        data: JSON.stringify({ orderId: order.id, orderNumber: order.orderNumber, reason: 'PAYMENT_REVERSED' }),
      },
    })
  }

  // Log for admin review
  console.warn(`[PAYMENT REVERSED] Order ${order.orderNumber} (${orderTrackingId}) — flagged for admin investigation`)

  console.log(`Payment ${orderTrackingId} marked as REVERSED, stock restored, parties notified`)
}
