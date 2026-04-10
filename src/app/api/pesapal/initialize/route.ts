/**
 * API: Initialize Pesapal Payment
 *
 * POST /api/pesapal/initialize
 *
 * Designed to work within Vercel Hobby's 10-second function timeout.
 *
 * Token caching strategy (2-tier, no external dependencies):
 * - L1: In-memory cache within same serverless invocation (instant)
 * - L2: Database Setting table (persists across cold starts, ~100ms)
 *
 * Critical path: DB reads (~1s) + submitOrder (3-5s) = ~4-6s on cached token
 * Edge case (first call / token expired): +auth (3-5s) = ~7-10s, single retry available
 *
 * IPN resolution: env var → DB (PlatformSettings) → empty string + async register
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

/**
 * Get IPN ID from fastest available source:
 * 1. Environment variable (instant)
 * 2. PlatformSettings in DB (fast, ~100ms)
 * 3. Empty string (proceed without IPN, register async after)
 *
 * NEVER calls Pesapal's API on the critical path.
 */
async function getIpnIdFast(): Promise<{ ipnId: string; fromDb: boolean }> {
  // 1. Environment variable
  const envIpn = process.env.PESAPAL_IPN_ID
  if (envIpn) return { ipnId: envIpn, fromDb: false }

  // 2. Database lookup
  try {
    const settings = await prisma.platformSettings.findFirst({
      select: { pesapalIpnId: true },
    })
    if (settings?.pesapalIpnId) {
      return { ipnId: settings.pesapalIpnId, fromDb: true }
    }
  } catch {
    // DB read failed — continue without IPN
  }

  // 3. No IPN found — proceed with empty string
  return { ipnId: '', fromDb: false }
}

/**
 * Fire-and-forget: register IPN with Pesapal and save to DB.
 * Runs AFTER the payment response is sent. Does not block the checkout flow.
 */
function registerIpnAsync(origin: string) {
  // Use setImmediate to run after the response is sent
  setImmediate(async () => {
    try {
      // First authenticate (needed for registerIPN)
      await pesapalClient.authenticate()

      const ipnUrl = `${origin}/api/pesapal/ipn`
      const registered = await pesapalClient.registerIPN(ipnUrl, 'POST')

      if (registered.ipn_id) {
        console.log(`[Pesapal] Registered IPN: ${registered.ipn_id} → ${ipnUrl}`)

        // Save to DB for future requests
        // PlatformSettings is a singleton — use findFirst + update (id is auto-generated UUID)
        try {
          const existing = await prisma.platformSettings.findFirst({ select: { id: true } })
          if (existing) {
            await prisma.platformSettings.update({
              where: { id: existing.id },
              data: { pesapalIpnId: registered.ipn_id },
            })
          } else {
            await prisma.platformSettings.create({
              data: { pesapalIpnId: registered.ipn_id },
            })
          }
          console.log(`[Pesapal] IPN ID saved to DB`)
        } catch (dbErr) {
          console.error('[Pesapal] Failed to save IPN to DB:', dbErr)
        }
      }
    } catch (err) {
      console.error('[Pesapal] Background IPN registration failed:', err)
    }
  })
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

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    // Phase 2: DB lookups + IPN resolution in PARALLEL (~1-2s)
    // IPN is read from env/DB only — NO Pesapal API call
    const [order, user, { ipnId }] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          Store: true,
          Payment: true,
        },
      }),
      prisma.user.findUnique({ where: { clerkId: userId } }),
      getIpnIdFast(),
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

    // Phase 3: Submit to Pesapal (~2-5s)
    // Only 1 Pesapal API call on the critical path: submitOrder
    // (authenticate is called inside submitOrder by the client, token not shared across instances)
    const orderTrackingId = generateTransactionReference('DUKA')

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

    // Phase 4: Update DB (~0.5s)
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

    // Fire-and-forget: register IPN if not already stored
    // This runs AFTER the response is sent, does not block payment
    if (!ipnId) {
      registerIpnAsync(origin)
    }

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
