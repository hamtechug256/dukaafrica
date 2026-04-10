/**
 * API: Initialize Pesapal Payment
 *
 * POST /api/pesapal/initialize
 *
 * Creates a payment order with Pesapal and returns the redirect URL
 * for the buyer to complete payment on Pesapal's hosted page.
 *
 * OPTIMIZED: All independent calls run in parallel to fit within
 * Vercel Hobby plan's 10-second serverless function timeout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pesapalClient, generateTransactionReference, PesapalCurrency, getCredentials } from '@/lib/pesapal/client'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Country name → 2-letter ISO code mapping for Pesapal billing
const COUNTRY_TO_ISO2: Record<string, string> = {
  UGANDA: 'UG', KENYA: 'KE', TANZANIA: 'TZ',
  RWANDA: 'RW', SOUTH_SUDAN: 'SS', BURUNDI: 'BI',
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Auth (must be first, ~1s)
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, customerEmail, customerPhone, customerName } = body

    // Step 2: Run all independent lookups IN PARALLEL (~2-3s combined instead of ~4s sequential)
    // - Order query (simplified: no deep Product→Store include)
    // - User lookup
    // - Pesapal credentials + IPN ID
    // - Pre-warm Pesapal auth token (authenticate in background)
    const [order, user, credentials] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: { OrderItem: true, Store: true },
      }),
      prisma.user.findUnique({ where: { clerkId: userId } }),
      // Start credentials resolution AND pre-warm the auth token concurrently
      Promise.all([getCredentials(), pesapalClient.authenticate()]).then(([creds]) => creds),
    ])

    // Validations
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (!user || order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (!credentials.ipnId) {
      return NextResponse.json(
        { error: 'IPN not configured. Please set PESAPAL_IPN_ID in environment variables.' },
        { status: 500 }
      )
    }

    // Step 3: Build and submit Pesapal order (~2-3s, token already cached)
    const orderTrackingId = generateTransactionReference('DUKA')
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    const pesapalOrderRequest = {
      id: orderTrackingId,
      currency: order.currency as PesapalCurrency,
      amount: toNum(order.total),
      description: `Order ${order.orderNumber}`,
      callback_url: `${origin}/checkout/success?orderId=${orderId}`,
      cancellation_url: `${origin}/checkout/success?orderId=${orderId}&cancelled=true`,
      notification_id: credentials.ipnId,
      billing_address: {
        email_address: customerEmail || user.email || '',
        phone_number: customerPhone || '',
        first_name: customerName?.split(' ')[0] || user.name?.split(' ')[0] || '',
        last_name: customerName?.split(' ').slice(1).join(' ') || user.name?.split(' ').slice(1).join(' ') || '',
        country_code: COUNTRY_TO_ISO2[order.buyerCountry || 'UGANDA'] || 'UG',
      },
    }

    const response = await pesapalClient.submitOrder(pesapalOrderRequest)

    if (response.error || response.status !== '200') {
      throw new Error(response.error || 'Failed to submit Pesapal order')
    }

    // Step 4: Update DB with payment reference (fire-and-forget style within transaction)
    // Calculate commission inline instead of calling the heavy calculatePaymentBreakdown
    const store = order.Store
    const commissionRate = toNum(store?.commissionRate) || 10 // default 10%
    const platformCommission = Math.round(toNum(order.subtotal) * (commissionRate / 100))
    const sellerAmount = toNum(order.subtotal) - platformCommission + toNum(order.shippingFee)
    const platformAmount = platformCommission

    // Use transaction for atomic update
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { paymentRef: orderTrackingId },
      }),
      prisma.payment.update({
        where: { orderId: order.id },
        data: {
          provider: 'PESAPAL',
          reference: orderTrackingId,
          sellerAmount,
          sellerCurrency: order.currency,
          platformAmount,
          platformCurrency: order.currency,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      paymentLink: response.redirect_url,
      orderTrackingId,
      merchantReference: response.merchant_reference,
    })

  } catch (error) {
    console.error('Pesapal payment initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
