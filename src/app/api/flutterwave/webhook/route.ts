/**
 * API: Flutterwave Webhook Handler
 *
 * POST /api/flutterwave/webhook
 *
 * Handles payment confirmation, escrow creation, and order updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFlutterwaveConfig } from '@/lib/flutterwave/client'
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
 * Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufferA = Buffer.from(a, 'utf-8')
    const bufferB = Buffer.from(b, 'utf-8')

    if (bufferA.length !== bufferB.length) {
      return false
    }

    return crypto.timingSafeEqual(bufferA, bufferB)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get config from database (priority) or env vars
    const config = await getFlutterwaveConfig()
    
    // Verify webhook signature with timing-safe comparison
    const signature = request.headers.get('verif-hash')
    const expectedSignature = config.webhookHash

    if (!signature || !expectedSignature || !safeCompare(signature, expectedSignature)) {
      console.error('Invalid Flutterwave webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = await request.json()

    console.log('Flutterwave webhook received:', {
      event: payload.event,
      txRef: payload.tx_ref,
      status: payload.status
    })

    // Handle different event types
    if (payload.event === 'charge.completed') {
      await handleSuccessfulPayment(payload)
    } else if (payload.event === 'transfer.completed') {
      await handleSuccessfulTransfer(payload)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleSuccessfulPayment(payload: any) {
  const { tx_ref, status, data } = payload

  if (status !== 'successful') {
    console.log(`Payment ${tx_ref} not successful: ${status}`)
    return
  }

  // Find the payment record
  const payment = await prisma.payment.findFirst({
    where: { reference: tx_ref },
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
    console.error(`Payment not found for tx_ref: ${tx_ref}`)
    return
  }

  const order = payment.Order

  // Check if already processed (idempotency)
  if (payment.status === 'PAID') {
    console.log('Payment already processed:', tx_ref)
    return
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PAID',
      providerRef: data.id?.toString(),
      paidAt: new Date(),
      providerResponse: JSON.stringify(payload)
    }
  })

  // Update order status
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: 'PAID',
      status: 'CONFIRMED'
    }
  })

  // Group items by store for escrow creation
  const storeTotals = new Map<string, number>()

  for (const item of order.OrderItem) {
    const existing = storeTotals.get(item.storeId) || 0
    storeTotals.set(item.storeId, existing + toNum(item.total))
  }

  // Process each store - create escrow for each
  for (const [storeId, storeTotal] of storeTotals) {
    // Get store info for escrow
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

    // Update product quantities
    const storeItems = order.OrderItem.filter(item => item.storeId === storeId)
    for (const item of storeItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: { decrement: item.quantity },
          purchaseCount: { increment: item.quantity },
        },
      })
    }

    // Create escrow for each store (now supports multi-vendor via unique constraint on orderId+storeId)
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
      // Fallback: update store stats without escrow
      const commissionRate = toNum(store.commissionRate) || 15
      const sellerAmount = Math.round(storeTotal * (1 - commissionRate / 100))
      await prisma.store.update({
        where: { id: storeId },
        data: {
          totalSales: { increment: storeTotal },
          totalOrders: { increment: 1 },
          escrowBalance: { increment: sellerAmount },
        },
      })
    }
  }

  console.log(`Payment ${tx_ref} processed successfully for order ${order.orderNumber}`)
}

async function handleSuccessfulTransfer(payload: any) {
  const { reference, status, data } = payload

  if (status !== 'successful') {
    console.log(`Transfer ${reference} not successful: ${status}`)
    return
  }

  // Find the payout record
  const payout = await prisma.sellerPayout.findFirst({
    where: { reference }
  })

  if (!payout) {
    console.error(`Payout not found for reference: ${reference}`)
    return
  }

  // IDEMPOTENCY: Skip if already processed
  if (payout.status === 'COMPLETED') {
    console.log(`Transfer ${reference} already processed, skipping`)
    return
  }

  // Update payout status + balance in a single transaction
  await prisma.$transaction(async (tx) => {
    await tx.sellerPayout.update({
      where: { id: payout.id },
      data: { status: 'COMPLETED', processedAt: new Date() }
    })

    await tx.store.update({
      where: { id: payout.storeId },
      data: { availableBalance: { decrement: toNum(payout.amount) } }
    })
  })

  console.log(`Transfer ${reference} completed successfully`)
}
