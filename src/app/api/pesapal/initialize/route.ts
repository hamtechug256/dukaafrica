/**
 * API: Initialize Pesapal Payment
 *
 * POST /api/pesapal/initialize  — Submit payment order to Pesapal
 * GET  /api/pesapal/initialize  — Pre-warm token (keeps this function instance alive)
 *
 * KEY INSIGHT: GET and POST share the SAME Vercel function instance.
 * Calling GET warms up the instance AND caches the token in memory (L1).
 * When the user clicks Pay (POST), there's zero cold start and L1 cache is hot.
 *
 * Designed for Vercel Hobby's 10-second function timeout:
 *
 * Warm instance + DB-cached token (normal case):
 *   Clerk auth (~0.3s) + DB reads (~0.3s) + authenticate L1 hit (<1ms)
 *   + submitOrder (3-5s) + DB update (~0.3s) = ~4-6s ✅
 *
 * Cold instance + DB-cached token (first request):
 *   Cold start (1-3s) + Clerk (~0.3s) + DB reads (~0.5s) + authenticate L2 hit (~0.2s)
 *   + submitOrder (3-5s) + DB update (~0.3s) = ~5-9s ✅
 *
 * IPN resolution: env var → DB Setting table → DB PlatformSettings → empty string
 *   NEVER calls Pesapal API on the critical path.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pesapalClient, generateTransactionReference, PesapalCurrency, getIpnIdFast, saveIpnToDb, getPublicPesapalConfig, PesapalAuthError } from '@/lib/pesapal/client'
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
  setImmediate(async () => {
    try {
      await pesapalClient.authenticate()
      const ipnUrl = `${origin}/api/pesapal/ipn`
      const registered = await pesapalClient.registerIPN(ipnUrl, 'POST')

      if (registered.ipn_id) {
        console.log(`[Pesapal] Registered IPN: ${registered.ipn_id} → ${ipnUrl}`)
        await saveIpnToDb(registered.ipn_id)

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
        } catch (dbErr) {
          console.error('[Pesapal] Failed to save IPN to PlatformSettings:', dbErr)
        }
      }
    } catch (err) {
      console.error('[Pesapal] Background IPN registration failed:', err)
    }
  })
}

// ============================================================
// GET — Pre-warm: authenticate + cache token in DB + L1 memory
// ============================================================
// This runs on the SAME Vercel function instance as POST.
// Calling this before the user clicks Pay eliminates cold starts
// and populates L1 memory cache so authenticate() returns instantly.
export async function GET() {
  const t0 = Date.now()
  try {
    // Diagnostic: check where credentials come from and their format
    const config = getPublicPesapalConfig()
    const envFromDb = await prisma.platformSettings.findFirst({
      select: { pesapalEnvironment: true, pesapalClientId: true, pesapalClientSecret: true },
    })

    // Read raw env vars for diagnostics (masked — only first 4 + last 4 chars)
    const rawEnvKey = process.env.PESAPAL_CLIENT_ID || ''
    const rawEnvSecret = process.env.PESAPAL_CLIENT_SECRET || ''
    const mask = (s: string) => s.length <= 8 ? '***' : `${s.slice(0, 4)}...${s.slice(-4)}`

    const diagnostics = {
      env: config.env,
      baseUrl: config.baseUrl,
      dbEnv: envFromDb?.pesapalEnvironment || null,
      hasDbCreds: !!envFromDb?.pesapalClientId,
      dbKeyLen: envFromDb?.pesapalClientId?.length || 0,
      dbKeyPrefix: mask(envFromDb?.pesapalClientId || ''),
      envKeyLen: rawEnvKey.length,
      envKeyPrefix: mask(rawEnvKey),
      envSecretLen: rawEnvSecret.length,
      envSecretPrefix: mask(rawEnvSecret),
      source: envFromDb?.pesapalClientId ? 'DB PlatformSettings' : (rawEnvKey ? 'env var PESAPAL_CLIENT_ID' : 'NONE'),
    }

    console.log(`[Pesapal Warm] diagnostics:`, JSON.stringify(diagnostics))

    // authenticate() checks L1 → L2 (DB) → L3 (Pesapal API)
    const token = await pesapalClient.authenticate()
    const elapsed = Date.now() - t0
    console.log(`[Pesapal Warm] Token ready in ${elapsed}ms`)

    // Also pre-resolve IPN ID so it's ready for the POST
    const ipnId = await getIpnIdFast()
    console.log(`[Pesapal Warm] IPN ID resolved: ${ipnId ? 'yes' : 'no'}`)

    return NextResponse.json({ ok: true, elapsed, ...diagnostics })
  } catch (error: unknown) {
    const elapsed = Date.now() - t0
    const name = error instanceof Error ? error.name : 'UnknownError'
    const message = error instanceof Error ? error.message : String(error)

    // Extract Pesapal's actual rejection reason if available
    let pesapalDetail: unknown = null
    if (error instanceof PesapalAuthError && error.pesapalResponse) {
      pesapalDetail = error.pesapalResponse
    }

    const envFromDb = await prisma.platformSettings.findFirst({
      select: { pesapalEnvironment: true, pesapalClientId: true, pesapalClientSecret: true },
    }).catch(() => null)

    // Read raw env vars for diagnostics (masked)
    const rawEnvKey = process.env.PESAPAL_CLIENT_ID || ''
    const rawEnvSecret = process.env.PESAPAL_CLIENT_SECRET || ''
    const mask = (s: string) => s.length <= 8 ? '***' : `${s.slice(0, 4)}...${s.slice(-4)}`

    const diagnostics = {
      env: getPublicPesapalConfig().env,
      baseUrl: getPublicPesapalConfig().baseUrl,
      dbEnv: envFromDb?.pesapalEnvironment || null,
      hasDbCreds: !!envFromDb?.pesapalClientId,
      dbKeyLen: envFromDb?.pesapalClientId?.length || 0,
      dbKeyPrefix: mask(envFromDb?.pesapalClientId || ''),
      envKeyLen: rawEnvKey.length,
      envKeyPrefix: mask(rawEnvKey),
      envSecretLen: rawEnvSecret.length,
      envSecretPrefix: mask(rawEnvSecret),
      source: envFromDb?.pesapalClientId ? 'DB PlatformSettings' : (rawEnvKey ? 'env var PESAPAL_CLIENT_ID' : 'NONE'),
    }

    console.error(`[Pesapal Warm] Failed after ${elapsed}ms:`, name, message, JSON.stringify(diagnostics))

    // Return 200 with diagnostic info — don't block checkout
    return NextResponse.json({
      ok: false,
      error: `${name}: ${message}`,
      elapsed,
      pesapalResponse: pesapalDetail,
      ...diagnostics,
    })
  }
}

// ============================================================
// POST — Initialize payment
// ============================================================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    // Phase 1: Clerk auth (~0.3s)
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, customerEmail, customerPhone, customerName } = body

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''

    console.log(`[Pesapal Init] Phase 1 (auth) — ${Date.now() - startTime}ms, origin=${origin || '(EMPTY)'}`)

    // Phase 2: DB lookups + IPN resolution in PARALLEL (~0.3s)
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

    console.log(`[Pesapal Init] Phase 2 (DB + IPN) — ${Date.now() - startTime}ms, ipnId=${ipnId ? 'yes' : 'no'}`)

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

    // Phase 2.5: Register IPN if not already stored
    // Pesapal v3 REQUIRES notification_id (a valid GUID) in SubmitOrder.
    // If we don't have one, register it NOW (before submitting the order).
    let resolvedIpnId = ipnId
    if (!resolvedIpnId && origin) {
      console.log(`[Pesapal Init] Phase 2.5 (registerIPN) — ${Date.now() - startTime}ms`)
      try {
        await pesapalClient.authenticate() // ensure token is available
        const ipnUrl = `${origin}/api/pesapal/ipn`
        const registered = await pesapalClient.registerIPN(ipnUrl, 'POST')
        if (registered.ipn_id) {
          resolvedIpnId = registered.ipn_id
          await saveIpnToDb(registered.ipn_id)
          // Also save to PlatformSettings
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
          } catch (dbErr) {
            console.error('[Pesapal Init] Failed to save IPN to PlatformSettings:', dbErr)
          }
          console.log(`[Pesapal Init] IPN registered: ${registered.ipn_id}`)
        } else {
          console.error('[Pesapal Init] IPN registration returned no ipn_id:', registered)
        }
      } catch (ipnErr) {
        console.error('[Pesapal Init] IPN registration failed (will proceed without):', ipnErr)
      }
    }

    // Phase 3: Submit to Pesapal (3-5s)
    // authenticate() reads from L1 (memory) or L2 (DB) — no extra Pesapal call.
    const orderTrackingId = generateTransactionReference('DUKA')
    const orderAmount = toNum(order.total)
    const orderCurrency = order.currency as PesapalCurrency

    console.log(`[Pesapal Init] Phase 3 (submitOrder) starting — ${Date.now() - startTime}ms, amount=${orderAmount}, currency=${orderCurrency}, ref=${orderTrackingId}, ipnId=${resolvedIpnId ? 'yes' : 'NO'}`)

    const response = await pesapalClient.submitOrder({
      id: orderTrackingId,
      currency: orderCurrency,
      amount: orderAmount,
      description: `Order ${order.orderNumber}`,
      callback_url: `${origin}/checkout/success?orderId=${orderId}`,
      cancellation_url: `${origin}/checkout/success?orderId=${orderId}&cancelled=true`,
      notification_id: resolvedIpnId,
      billing_address: {
        email_address: customerEmail || user.email || '',
        phone_number: customerPhone || '',
        first_name: customerName?.split(' ')[0] || user.name?.split(' ')[0] || '',
        last_name: customerName?.split(' ').slice(1).join(' ') || user.name?.split(' ').slice(1).join(' ') || '',
        country_code: COUNTRY_TO_ISO2[order.buyerCountry || 'UGANDA'] || 'UG',
      },
    })

    console.log(`[Pesapal Init] Phase 3 (submitOrder) done — ${Date.now() - startTime}ms`)

    if (response.error || response.status !== '200') {
      const errMsg = response.error
        ? (typeof response.error === 'string' ? response.error : JSON.stringify(response.error))
        : 'Failed to submit Pesapal order'
      throw new Error(`Pesapal submitOrder failed (status=${response.status}): ${errMsg}`)
    }

    // Phase 4: Update DB (~0.3s)
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

    console.log(`[Pesapal Init] DONE — ${Date.now() - startTime}ms TOTAL`)

    // IPN was registered in Phase 2.5 if needed — no fire-and-forget required

    return NextResponse.json({
      success: true,
      paymentLink: response.redirect_url,
      orderTrackingId,
      merchantReference: response.merchant_reference,
    })

  } catch (error: unknown) {
    const elapsed = Date.now() - startTime

    // Safely extract error info — handle objects, strings, and Error instances
    let detail = 'Unknown error'
    let status = 500
    let errorType = 'unknown'

    if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>

      // Check for PesapalApiError by duck-typing (more reliable than instanceof on Vercel)
      if ('statusCode' in errObj && 'endpoint' in errObj && 'message' in errObj) {
        detail = `Pesapal API ${errObj.statusCode}: ${String(errObj.message)}`
        status = 502
        errorType = 'PesapalApi'
        console.error(`[Pesapal Init] Pesapal API error: endpoint=${errObj.endpoint}, statusCode=${errObj.statusCode}, body=`, errObj.responseBody)
      }
      // Check for PesapalAuthError by duck-typing
      else if ('pesapalResponse' in errObj && 'message' in errObj) {
        detail = `Pesapal Auth: ${String(errObj.message)}`
        status = 502
        errorType = 'PesapalAuth'
        console.error(`[Pesapal Init] Pesapal Auth error:`, errObj.pesapalResponse)
      }
      // General Error instance
      else if (error instanceof Error) {
        detail = error.message || String(error)
        errorType = error.constructor?.name || 'Error'
      }
      // Plain object thrown (some libraries do this)
      else if ('message' in errObj) {
        detail = String(errObj.message)
        errorType = 'Object'
      }
    } else if (typeof error === 'string') {
      detail = error
      errorType = 'String'
    }

    // Ensure detail is always a proper string, never '[object Object]'
    if (typeof detail !== 'string' || detail === '[object Object]') {
      detail = JSON.stringify(detail)
    }

    console.error(`[Pesapal Init] ERROR after ${elapsed}ms [${errorType}]: ${detail}`)

    return NextResponse.json(
      { error: detail, elapsed, errorType },
      { status }
    )
  }
}
