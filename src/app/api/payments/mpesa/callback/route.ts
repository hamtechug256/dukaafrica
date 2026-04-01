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

/**
 * M-Pesa C2B STK Push Callback Handler
 *
 * SECURITY MODEL:
 * M-Pesa C2B callbacks do NOT send signatures or auth headers. Security relies on:
 * 1. Callback URL registered exclusively with Safaricom
 * 2. CheckoutRequestID must match an actual pending payment in our DB
 * 3. ResultCode must be 0 (success) - we only process successful callbacks
 * 4. Idempotency: we skip if payment is already PAID or FAILED
 * 5. Rate limiting to prevent callback spam
 * 6. Structured audit logging for every callback received
 *
 * This endpoint MUST be public (no Clerk auth) since Safaricom sends no auth headers.
 */

// ---------------------------------------------------------------------------
// In-memory rate limiter (per CheckoutRequestID to avoid duplicate processing)
// Key: CheckoutRequestID, Value: timestamp of last processed callback
// ---------------------------------------------------------------------------
const callbackProcessingTimestamps = new Map<string, number>()
const CALLBACK_COOLDOWN_MS = 30_000 // 30 seconds - ignore duplicate rapid-fire callbacks

// ---------------------------------------------------------------------------
// In-memory IP rate limiter (per IP to prevent spam)
// Key: IP, Value: { count, windowStart }
// ---------------------------------------------------------------------------
const ipRateLimits = new Map<string, { count: number; windowStart: number }>()
const IP_RATE_LIMIT_MAX = 20 // max callbacks per window
const IP_RATE_WINDOW_MS = 60_000 // 1 minute window

/**
 * Get client IP from request headers
 */
function getClientIP(req: NextRequest): string {
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  const realIP = req.headers.get('x-real-ip')
  const forwarded = req.headers.get('x-forwarded-for')

  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}

/**
 * Check if a callback for this CheckoutRequestID was recently processed
 * (prevents duplicate rapid-fire processing)
 */
function isCallbackOnCooldown(checkoutRequestID: string): boolean {
  const lastProcessed = callbackProcessingTimestamps.get(checkoutRequestID)
  if (!lastProcessed) return false

  if (Date.now() - lastProcessed < CALLBACK_COOLDOWN_MS) {
    return true
  }

  // Cooldown expired, clean up
  callbackProcessingTimestamps.delete(checkoutRequestID)
  return false
}

/**
 * Check if IP has exceeded rate limit for callback spam prevention
 */
function isIPRateLimited(ip: string): boolean {
  const record = ipRateLimits.get(ip)
  const now = Date.now()

  if (!record || now - record.windowStart > IP_RATE_WINDOW_MS) {
    // Reset or create new window
    ipRateLimits.set(ip, { count: 1, windowStart: now })
    return false
  }

  record.count++

  if (record.count > IP_RATE_LIMIT_MAX) {
    return true
  }

  return false
}

/**
 * Validate the M-Pesa callback body structure.
 * Ensures required M-Pesa STK callback fields are present and correctly typed.
 */
function validateCallbackBody(body: any): {
  valid: boolean
  error?: string
  checkoutRequestID?: string
  resultCode?: number
  resultDesc?: string
  callbackMetadata?: any
} {
  // Top-level Body must exist
  if (!body?.Body?.stkCallback) {
    return { valid: false, error: 'Missing Body.stkCallback' }
  }

  const { stkCallback } = body.Body

  // CheckoutRequestID is required - this is how we match to our payment record
  if (!stkCallback.CheckoutRequestID || typeof stkCallback.CheckoutRequestID !== 'string') {
    return { valid: false, error: 'Missing or invalid CheckoutRequestID' }
  }

  // ResultCode must be a number
  if (stkCallback.ResultCode === undefined || stkCallback.ResultCode === null) {
    return { valid: false, error: 'Missing ResultCode' }
  }

  // ResultDesc should be present
  if (!stkCallback.ResultDesc && stkCallback.ResultCode !== 0) {
    return { valid: false, error: 'Missing ResultDesc for failed transaction' }
  }

  // For successful transactions, CallbackMetadata with Item array is required
  if (stkCallback.ResultCode === 0) {
    if (!stkCallback.CallbackMetadata?.Item || !Array.isArray(stkCallback.CallbackMetadata.Item)) {
      return { valid: false, error: 'Missing CallbackMetadata.Item for successful transaction' }
    }
  }

  return {
    valid: true,
    checkoutRequestID: stkCallback.CheckoutRequestID,
    resultCode: Number(stkCallback.ResultCode),
    resultDesc: stkCallback.ResultDesc,
    callbackMetadata: stkCallback.CallbackMetadata,
  }
}

// M-Pesa Callback
export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req)

  // --- IP Rate Limiting ---
  if (isIPRateLimited(clientIP)) {
    console.error(`[MPESA-CALLBACK] Rate limited IP: ${clientIP}`)
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()

    // --- Structured Body Validation ---
    const validation = validateCallbackBody(body)

    if (!validation.valid) {
      console.error(
        `[MPESA-CALLBACK] Invalid callback structure from IP ${clientIP}:`,
        validation.error,
        JSON.stringify(body).slice(0, 500)
      )

      // Create security log for suspicious/malformed callbacks
      await prisma.securityLog.create({
        data: {
          type: 'MPESA_CALLBACK_INVALID',
          identifier: clientIP,
          details: JSON.stringify({
            error: validation.error,
            bodyPreview: JSON.stringify(body).slice(0, 1000),
          }),
          path: '/api/payments/mpesa/callback',
          userAgent: req.headers.get('user-agent') || null,
        },
      })

      return NextResponse.json({ error: 'Invalid callback structure' }, { status: 400 })
    }

    const { checkoutRequestID, resultCode, resultDesc, callbackMetadata } = validation

    // TypeScript guard: checkoutRequestID is guaranteed when valid is true
    if (!checkoutRequestID) {
      return NextResponse.json({ error: 'Missing checkoutRequestID' }, { status: 400 })
    }

    // --- Audit Log every callback received ---
    console.log(`[MPESA-CALLBACK] Received callback for CheckoutRequestID: ${checkoutRequestID}, ResultCode: ${resultCode}, IP: ${clientIP}`)

    // --- Cooldown Check (prevent duplicate rapid processing) ---
    if (isCallbackOnCooldown(checkoutRequestID)) {
      console.warn(`[MPESA-CALLBACK] Callback on cooldown for CheckoutRequestID: ${checkoutRequestID}. Ignoring duplicate.`)
      return NextResponse.json({ success: true, message: 'Already processing' })
    }

    // Mark cooldown
    callbackProcessingTimestamps.set(checkoutRequestID, Date.now())

    // --- Lookup Payment by providerRef (= CheckoutRequestID) ---
    const payment = await prisma.payment.findFirst({
      where: { providerRef: checkoutRequestID },
      include: { Order: true },
    })

    if (!payment) {
      console.warn(`[MPESA-CALLBACK] No payment found for CheckoutRequestID: ${checkoutRequestID}`)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // --- Idempotency: skip if already in terminal state ---
    if (payment.status === 'PAID') {
      console.log(`[MPESA-CALLBACK] Payment ${payment.id} already PAID. Skipping idempotent callback.`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    if (payment.status === 'FAILED') {
      console.log(`[MPESA-CALLBACK] Payment ${payment.id} already FAILED. Skipping idempotent callback.`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    // --- Only process SUCCESSFUL payments (ResultCode === 0) ---
    if (resultCode === 0) {
      // Extract metadata fields from CallbackMetadata.Item
      const metadata = callbackMetadata?.Item || []

      const getMetadataValue = (name: string): any => {
        const item = metadata.find((i: any) => i.Name === name)
        return item?.Value
      }

      const mpesaReceiptNumber = getMetadataValue('MpesaReceiptNumber')
      const transactionDate = getMetadataValue('TransactionDate')
      const amount = getMetadataValue('Amount')

      // SECURITY: Validate amount matches what we expect (prevent amount tampering)
      const expectedAmount = toNum(payment.amount)
      if (amount !== undefined && Number(amount) !== Math.ceil(expectedAmount)) {
        console.error(
          `[MPESA-CALLBACK] AMOUNT MISMATCH for payment ${payment.id}! Expected: ${Math.ceil(expectedAmount)}, Received: ${amount}. Rejecting.`
        )

        await prisma.securityLog.create({
          data: {
            type: 'MPESA_AMOUNT_MISMATCH',
            identifier: checkoutRequestID,
            details: JSON.stringify({
              paymentId: payment.id,
              expectedAmount,
              receivedAmount: amount,
              clientIP,
            }),
            path: '/api/payments/mpesa/callback',
          },
        })

        // Mark as failed - don't process mismatched amounts
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            providerResponse: JSON.stringify(body),
            failedAt: new Date(),
          },
        })

        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
      }

      // Use a Prisma transaction to ensure atomicity of payment + order updates
      await prisma.$transaction(async (tx) => {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            reference: mpesaReceiptNumber || null,
            providerResponse: JSON.stringify(body),
            paidAt: new Date(),
          },
        })

        // Update order
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            paymentRef: mpesaReceiptNumber || null,
          },
        })

        // Update product quantities and store stats
        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
          include: { OrderItem: true },
        })

        if (order) {
          for (const item of order.OrderItem) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                quantity: { decrement: item.quantity },
                purchaseCount: { increment: item.quantity },
              },
            })

            await tx.store.update({
              where: { id: item.storeId },
              data: {
                totalSales: { increment: item.total },
                totalOrders: { increment: 1 },
              },
            })
          }
        }

        // Audit log for successful payment confirmation
        await tx.securityLog.create({
          data: {
            type: 'MPESA_CALLBACK_SUCCESS',
            identifier: checkoutRequestID,
            details: JSON.stringify({
              paymentId: payment.id,
              orderId: payment.orderId,
              amount,
              receiptNumber: mpesaReceiptNumber,
              clientIP,
            }),
            path: '/api/payments/mpesa/callback',
          },
        })
      })

      console.log(`[MPESA-CALLBACK] Payment ${payment.id} confirmed PAID via M-Pesa. Receipt: ${mpesaReceiptNumber}`)

      // FIX: Create escrow holds per store (same pattern as Flutterwave webhook)
      try {
        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          include: { OrderItem: true },
        })

        if (order) {
          const storeTotals = new Map<string, number>()
          for (const item of order.OrderItem) {
            const itemTotal = toNum(item.total) || toNum(item.price) * item.quantity
            storeTotals.set(item.storeId, (storeTotals.get(item.storeId) || 0) + itemTotal)
          }

          for (const [storeId, storeTotal] of storeTotals) {
            const store = await prisma.store.findUnique({
              where: { id: storeId },
              select: {
                id: true,
                verificationTier: true,
                verificationStatus: true,
                commissionRate: true,
              },
            })

            if (store) {
              await createEscrowHold({
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
            }
          }
        }
      } catch (escrowError) {
        console.error('[MPESA-CALLBACK] Escrow creation failed (non-fatal):', escrowError)
      }
    } else {
      // Payment failed - update status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          providerResponse: JSON.stringify(body),
          failedAt: new Date(),
        },
      })

      console.warn(
        `[MPESA-CALLBACK] Payment ${payment.id} FAILED. ResultCode: ${resultCode}, ResultDesc: ${resultDesc}`
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MPESA-CALLBACK] Fatal error:', error)
    return NextResponse.json({ error: 'Callback error' }, { status: 500 })
  }
}
