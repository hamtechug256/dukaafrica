/**
 * API: Flutterwave Webhook Handler
 * 
 * POST /api/flutterwave/webhook
 * 
 * Handles payment confirmation and updates order status
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { FLUTTERWAVE_CONFIG } from '@/lib/flutterwave/client'
import crypto from 'crypto'

/**
 * Compare two strings using timing-safe comparison
 * to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  try {
    // Create buffers from the strings
    const bufferA = Buffer.from(a, 'utf8')
    const bufferB = Buffer.from(b, 'utf8')
    
    // If lengths differ, still compare to prevent length-based timing attacks
    if (bufferA.length !== bufferB.length) {
      // Use a dummy comparison to maintain constant time
      crypto.timingSafeEqual(bufferA, bufferA)
      return false
    }
    
    return crypto.timingSafeEqual(bufferA, bufferB)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature using timing-safe comparison
    const signature = request.headers.get('verif-hash')
    const webhookHash = FLUTTERWAVE_CONFIG.webhookHash
    
    if (!signature || !webhookHash || !safeCompare(signature, webhookHash)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
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
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
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
    include: { Order: true }
  })

  if (!payment) {
    console.error(`Payment not found for tx_ref: ${tx_ref}`)
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

  // Update seller's balance
  const order = payment.Order
  await prisma.store.update({
    where: { id: order.storeId || '' },
    data: {
      pendingBalance: {
        increment: payment.sellerAmount
      }
    }
  })

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

  console.log(`Transfer ${reference} completed successfully`)
}
