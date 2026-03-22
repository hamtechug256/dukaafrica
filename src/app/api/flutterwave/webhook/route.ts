/**
 * API: Flutterwave Webhook Handler
 * 
 * POST /api/flutterwave/webhook
 * 
 * Handles payment confirmation and updates order status
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { FLUTTERWAVE_CONFIG, flutterwaveClient } from '@/lib/flutterwave/client'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  try {
    // Convert to buffers and use timing-safe comparison
    const bufferA = Buffer.from(a, 'utf-8')
    const bufferB = Buffer.from(b, 'utf-8')
    
    // Lengths must match for timing-safe comparison
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
    // Verify webhook signature with timing-safe comparison
    const signature = request.headers.get('verif-hash')
    const expectedSignature = FLUTTERWAVE_CONFIG.webhookHash
    
    if (!signature || !expectedSignature || !safeCompare(signature, expectedSignature)) {
      logger.security('Invalid webhook signature', { hasSignature: !!signature })
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload = await request.json()
    
    logger.info('Flutterwave webhook received', {
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
    logger.error('Webhook processing error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSuccessfulPayment(payload: any) {
  const { tx_ref, status, data } = payload

  if (status !== 'successful') {
    logger.warn('Payment not successful', { txRef: tx_ref, status })
    return
  }

  // Find the payment record
  const payment = await prisma.payment.findFirst({
    where: { reference: tx_ref },
    include: { Order: true }
  })

  if (!payment) {
    logger.error('Payment not found for transaction', { txRef: tx_ref })
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

  // Update seller's balance (only if order has a valid storeId)
  const order = payment.Order
  
  if (order.storeId) {
    await prisma.store.update({
      where: { id: order.storeId },
      data: {
        pendingBalance: {
          increment: payment.sellerAmount
        }
      }
    })
    logger.info('Payment processed successfully', { txRef: tx_ref, orderNumber: order.orderNumber, sellerAmount: payment.sellerAmount })
  } else {
    // Log warning for orders without storeId (platform orders or data issues)
    logger.warn('Order has no storeId - seller balance not updated', { orderNumber: order.orderNumber, txRef: tx_ref })
  }
}

async function handleSuccessfulTransfer(payload: any) {
  const { reference, status, data } = payload

  if (status !== 'successful') {
    logger.warn('Transfer not successful', { reference, status })
    return
  }

  // Find the payout record
  const payout = await prisma.sellerPayout.findFirst({
    where: { reference }
  })

  if (!payout) {
    logger.error('Payout not found for reference', { reference })
    return
  }

  // Update payout status
  await prisma.sellerPayout.update({
    where: { id: payout.id },
    data: {
      status: 'COMPLETED',
      processedAt: new Date()
    }
  })

  // Update store balance
  await prisma.store.update({
    where: { id: payout.storeId },
    data: {
      availableBalance: {
        decrement: payout.amount
      }
    }
  })

  logger.info('Transfer completed successfully', { reference, amount: payout.amount })
}
