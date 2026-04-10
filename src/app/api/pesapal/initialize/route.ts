/**
 * API: Initialize Pesapal Payment
 *
 * POST /api/pesapal/initialize
 *
 * ULTRA-OPTIMIZED for Vercel Hobby's 10-second function timeout.
 * Eliminates all non-essential calls: no getCredentials() DB lookup,
 * no separate Payment query (included in order), no calculatePaymentBreakdown.
 *
 * Timeline (warm):  auth(1s) → parallel[order+user](2s) → submitOrder(2s) → DB(0.5s) = ~5.5s
 * Timeline (cold):  auth(1s) → parallel[order+user](3s) → submitOrder(3s) → DB(1s) = ~8s
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pesapalClient, generateTransactionReference, PesapalCurrency } from '@/lib/pesapal/client'
import { Prisma } from '@prisma/client'

function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

const COUNTRY_TO_ISO2: Record<string, string> = {
  UGANDA: 'UG', KENYA: 'KE', TANZANIA: 'TZ',
  RWANDA: 'RW', SOUTH_SUDAN: 'SS', BURUNDI: 'BI',
}

export async function POST(request: NextRequest) {
  try {
    // Phase 1: Auth (~1s)
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, customerEmail, customerPhone, customerName } = body

    // Fast-fail: check required env vars before any DB calls
    const ipnId = process.env.PESAPAL_IPN_ID || ''
    if (!ipnId) {
      return NextResponse.json(
        { error: 'PESAPAL_IPN_ID environment variable is required. Set it in Vercel dashboard → Settings → Environment Variables.' },
        { status: 500 }
      )
    }

    // Phase 2: All DB lookups in PARALLEL (~2-3s)
    // Include Payment in order query to eliminate a separate findUnique call
    const [order, user] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          Store: true,
          Payment: true, // Get payment record inline — saves one DB round-trip
        },
      }),
      prisma.user.findUnique({ where: { clerkId: userId } }),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (!user || order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const payment = order.Payment
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // Phase 3: Submit to Pesapal (~2-3s)
    // Token auth happens inside submitOrder — Pesapal client caches it per-request
    const orderTrackingId = generateTransactionReference('DUKA')
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    const response = await pesapalClient.submitOrder({
      id: orderTrackingId,
      currency: order.currency as PesapalCurrency,
      amount: toNum(order.total),
      description: `Order ${order.orderNumber}`,
      callback_url: `${origin}/checkout/success?orderId=${orderId}`,
      cancellation_url: `${origin}/checkout/success?orderId=${orderId}&cancelled=true`,
      notification_id: ipnId,
      billing_address: {
        email_address: customerEmail || user.email || '',
        phone_number: customerPhone || '',
        first_name: customerName?.split(' ')[0] || user.name?.split(' ')[0] || '',
        last_name: customerName?.split(' ').slice(1).join(' ') || user.name?.split(' ').slice(1).join(' ') || '',
        country_code: COUNTRY_TO_ISO2[order.buyerCountry || 'UGANDA'] || 'UG',
      },
    })

    if (response.error || response.status !== '200') {
      throw new Error(response.error || 'Failed to submit Pesapal order')
    }

    // Phase 4: Update DB — inline commission calc, single transaction (~0.5s)
    const commissionRate = toNum(order.Store?.commissionRate) || 10
    const platformCommission = Math.round(toNum(order.subtotal) * (commissionRate / 100))

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { paymentRef: orderTrackingId },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider: 'PESAPAL',
          reference: orderTrackingId,
          sellerAmount: toNum(order.subtotal) - platformCommission + toNum(order.shippingFee),
          sellerCurrency: order.currency,
          platformAmount: platformCommission,
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
    console.error('Pesapal init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
