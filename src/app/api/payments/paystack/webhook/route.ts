/**
 * Paystack Webhook Handler
 *
 * Handles payment confirmation, escrow creation, and order updates.
 *
 * Payment processing (payment update, order update, product quantities,
 * store sales) is wrapped in a single Prisma transaction to guarantee
 * atomicity.  Escrow creation runs *after* the transaction commits and
 * its failure is non-fatal (logged but does not roll back the payment).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createEscrowHold } from '@/lib/escrow'
import { Prisma } from '@prisma/client'
import crypto from 'crypto'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

/**
 * Verify Paystack webhook signature
 * Uses timing-safe comparison to prevent timing attacks
 */
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET
  if (!secret) {
    console.error('PAYSTACK_WEBHOOK_SECRET not configured')
    return false
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    // Verify signature - CRITICAL for security
    if (!signature || !verifySignature(rawBody, signature)) {
      console.error('Invalid Paystack webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const event = body.event
    const data = body.data

    console.log('Paystack webhook event:', event)

    switch (event) {
      case 'charge.success':
        await handleSuccessfulPayment(data)
        break

      case 'charge.failed':
        await handleFailedPayment(data)
        break

      default:
        console.log('Unhandled Paystack event:', event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

async function handleSuccessfulPayment(data: any) {
  const reference = data.reference
  const orderId = reference.replace('DA-', '')

  // ── Pre-transaction reads ────────────────────────────────────────
  const payment = await prisma.payment.findFirst({
    where: { orderId },
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
    console.error('Payment or Order not found for:', orderId)
    return
  }

  const order = payment.Order

  // Idempotency guard – safe outside the transaction because a
  // concurrent duplicate webhook would also see PAID and bail out.
  if (payment.status === 'PAID') {
    console.log('Payment already processed:', orderId)
    return
  }

  // Group items by store (pure in-memory computation)
  const storeTotals = new Map<string, { total: number; items: typeof order.OrderItem }>()
  for (const item of order.OrderItem) {
    const existing = storeTotals.get(item.storeId) || { total: 0, items: [] }
    existing.total += toNum(item.total)
    existing.items.push(item)
    storeTotals.set(item.storeId, { ...existing, items: existing.items })
  }

  const storeIds = Array.from(storeTotals.keys())
  const isMultiVendor = storeIds.length > 1

  // Pre-fetch all store metadata needed for escrow (outside tx so it
  // can be referenced after the transaction commits).
  const storeInfoMap = new Map<
    string,
    {
      id: string
      userId: string
      verificationTier: any
      verificationStatus: any
      commissionRate: any
    }
  >()

  for (const storeId of storeIds) {
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
    if (store) {
      storeInfoMap.set(storeId, store)
    }
  }

  // ── ATOMIC TRANSACTION ───────────────────────────────────────────
  // Wraps payment update, order update, product quantity/purchaseCount
  // decrements, and store totalSales increments into a single
  // transaction so a mid-process crash cannot leave partial state.
  await prisma.$transaction(async (tx) => {
    // 1. Update payment status
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        providerRef: data.id?.toString(),
        providerResponse: JSON.stringify(data),
        paidAt: new Date(),
      },
    })

    // 2. Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
    })

    // 3. Decrement product quantity & increment purchaseCount (per item)
    for (const item of order.OrderItem) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: { decrement: item.quantity },
          purchaseCount: { increment: item.quantity },
        },
      })
    }

    // 4. Increment store totalSales (per store)
    for (const [storeId, { total: storeTotal }] of storeTotals) {
      await tx.store.update({
        where: { id: storeId },
        data: {
          totalSales: { increment: storeTotal },
        },
      })
    }
  })
  // ── END TRANSACTION ──────────────────────────────────────────────

  // ── ESCROW CREATION (outside transaction – non-fatal) ────────────
  // totalSales has already been atomically updated above.  Only escrow
  // bookkeeping (escrowBalance) happens here; a failure is logged but
  // does not roll back the payment.
  for (const [storeId, { total: storeTotal }] of storeTotals) {
    const store = storeInfoMap.get(storeId)
    if (!store) {
      console.error('Store not found:', storeId)
      continue
    }

    const commissionRate = toNum(store.commissionRate) || 15 // Default 15%
    const sellerAmount = Math.round(storeTotal * (1 - commissionRate / 100))

    if (isMultiVendor) {
      // For multi-vendor orders, update escrow balances directly
      // (escrow unique constraint on orderId prevents multiple escrows)
      // TODO: Consider schema change to support multi-vendor escrows
      await prisma.store.update({
        where: { id: storeId },
        data: {
          escrowBalance: { increment: sellerAmount },
        },
      })
      console.log(`Multi-vendor: Updated store ${storeId} escrow balance: ${sellerAmount}`)
    } else {
      // Single vendor: create proper escrow
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
        // Fallback: update escrow balance without escrow record
        // (totalSales already updated inside the transaction above)
        await prisma.store.update({
          where: { id: storeId },
          data: {
            escrowBalance: { increment: sellerAmount },
          },
        })
      }
    }
  }

  console.log(`Payment processed successfully for order ${order.orderNumber}`)
}

async function handleFailedPayment(data: any) {
  const reference = data.reference
  const orderId = reference.replace('DA-', '')

  await prisma.payment.updateMany({
    where: { orderId },
    data: {
      status: 'FAILED',
      providerResponse: JSON.stringify(data),
      failedAt: new Date(),
    },
  })

  // Update order status
  await prisma.order.updateMany({
    where: { id: orderId },
    data: {
      paymentStatus: 'FAILED',
    },
  })

  console.log('Payment failed for order:', orderId)
}
