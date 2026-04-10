/**
 * API: Initialize Pesapal Payment
 *
 * POST /api/pesapal/initialize
 *
 * Designed to work within Vercel Hobby's 10-second function timeout.
 *
 * Critical path (normal case — token cached in DB):
 *   Clerk auth (~0.5s) + DB lookups (~0.5s) + submitOrder (3-5s) + DB update (~0.5s) = ~5-7s
 *
 * Critical path (worst case — token NOT cached):
 *   Clerk auth (~0.5s) + DB lookups (~0.5s) + authenticate (3-5s) + submitOrder (3-5s) + DB update (~0.5s) = ~8-12s
 *   → Pre-warming via ensure-token at step 0 ensures this rarely happens
 *
 * IPN resolution: env var → DB Setting table → DB PlatformSettings → empty string
 *   NEVER calls Pesapal API on the critical path.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pesapalClient, generateTransactionReference, PesapalCurrency, getIpnIdFast, saveIpnToDb } from '@/lib/pesapal/client'
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
 * Fire-and-forget: register IPN with Pesapal and save to BOTH DB tables.
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

        // Save to BOTH tables for redundancy:
        // 1. Setting table (fast, used by getIpnIdFast)
        await saveIpnToDb(registered.ipn_id)

        // 2. PlatformSettings table (admin config)
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
          console.log(`[Pesapal] IPN ID saved to both DB tables`)
        } catch (dbErr) {
          console.error('[Pesapal] Failed to save IPN to PlatformSettings:', dbErr)
        }
      }
    } catch (err) {
      console.error('[Pesapal] Background IPN registration failed:', err)
    }
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    // Phase 1: Clerk auth (~0.5s)
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, customerEmail, customerPhone, customerName } = body

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    console.log(`[Pesapal Init] Phase 1 done (auth) — ${Date.now() - startTime}ms`)

    // Phase 2: DB lookups + IPN resolution in PARALLEL (~0.5s)
    // IPN is read from env/DB only — NO Pesapal API call
    const [order, user, ipnId] = await Promise.all([
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

    console.log(`[Pesapal Init] Phase 2 done (DB + IPN) — ${Date.now() - startTime}ms, ipnId=${ipnId ? 'yes' : 'no'}`)

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

    // Phase 3: Submit to Pesapal (3-5s)
    // This is the ONLY Pesapal API call on the critical path.
    // authenticate() reads token from DB (~100ms) — no additional Pesapal call.
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

    console.log(`[Pesapal Init] Phase 3 done (submitOrder) — ${Date.now() - startTime}ms`)

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

    console.log(`[Pesapal Init] Phase 4 done (DB update) — ${Date.now() - startTime}ms — TOTAL`)

    // Fire-and-forget: register IPN if not already stored
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
    console.error(`[Pesapal Init] ERROR after ${Date.now() - startTime}ms:`, error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
