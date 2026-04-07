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
  } else {
    console.log(`Pesapal IPN — unhandled status "${order_status}" for ${order_tracking_id}`)
  }
}

// ============================================================
// COMPLETED PAYMENT
// ============================================================

async function handleCompletedPayment(orderTrackingId: string, payload: PesapalIPNPayload) {
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

  // Check idempotency — skip if already PAID
  if (payment.status === 'PAID') {
    console.log('Payment already processed:', orderTrackingId)
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
    // 1. Update payment status
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        providerRef: payload.order_tracking_id,
        paidAt: new Date(),
        providerResponse: JSON.stringify(payload),
      },
    })

    // 2. Update order status
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
    })

    // 3. Per-store: decrement stock & increment totalSales
    for (const [storeId, storeTotal] of storeTotals) {
      const storeItems = order.OrderItem.filter(item => item.storeId === storeId)

      for (const item of storeItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { decrement: item.quantity },
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
      },
    })

    if (!store) {
      console.error('Store not found:', storeId)
      continue
    }

    const escrowResult = await createEscrowHold({
      orderId: order.id,
      storeId: store.id,
      buyerId: order.userId,
      grossAmount: storeTotal,
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

  if (payment.status === 'FAILED') {
    console.log('Payment already marked as failed:', orderTrackingId)
    return
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      providerResponse: JSON.stringify(payload),
    },
  })

  // Update order payment status
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: 'FAILED',
    },
  })

  console.log(`Payment ${orderTrackingId} marked as FAILED`)
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

  if (payment.status === 'CANCELLED') {
    console.log('Payment already marked as cancelled:', orderTrackingId)
    return
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'CANCELLED',
      providerResponse: JSON.stringify(payload),
    },
  })

  // Update order payment status
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: 'CANCELLED',
    },
  })

  console.log(`Payment ${orderTrackingId} marked as CANCELLED`)
}
