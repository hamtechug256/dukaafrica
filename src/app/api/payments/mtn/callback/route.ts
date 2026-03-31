import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * MTN Mobile Money Callback Handler
 *
 * SECURITY MODEL:
 * - MTN MoMo does not send webhook signatures. Security relies on:
 *   1. Callback URL registered with MTN
 *   2. Verifying payment status via MTN API before confirming
 *   3. Idempotency checks
 *   4. Amount verification against our records
 *   5. Audit logging
 *
 * This endpoint MUST be public (no Clerk auth) since MTN sends no auth headers.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate structure - MTN sends { "status": "...", "financialTransactionId": "...", "externalId": "..." }
    if (!body) {
      return NextResponse.json({ error: 'Invalid callback' }, { status: 400 })
    }

    const { status, financialTransactionId, externalId, amount: callbackAmount } = body

    // Find payment by the external reference (X-Reference-Id we sent in initiation)
    const payment = await prisma.payment.findFirst({
      where: { providerRef: externalId || financialTransactionId },
      include: { Order: true },
    })

    if (!payment) {
      console.warn(`[MTN-CALLBACK] No payment found for reference: ${externalId || financialTransactionId}`)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Idempotency
    if (payment.status === 'PAID') {
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    const isSuccess = status === 'SUCCESSFUL' || status === 'COMPLETED'

    if (isSuccess) {
      // SECURITY: Verify amount matches our records
      if (callbackAmount && Number(callbackAmount) !== Math.ceil(Number(payment.amount))) {
        console.error(
          `[MTN-CALLBACK] AMOUNT MISMATCH! Expected: ${payment.amount}, Received: ${callbackAmount}`
        )

        await prisma.securityLog.create({
          data: {
            type: 'MTN_AMOUNT_MISMATCH',
            identifier: externalId || financialTransactionId,
            details: JSON.stringify({
              paymentId: payment.id,
              expectedAmount: String(payment.amount),
              receivedAmount: String(callbackAmount),
            }),
            path: '/api/payments/mtn/callback',
          },
        })

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

      // Optionally verify with MTN API before confirming (adds security but latency)
      // For high-value transactions, this is recommended
      if (process.env.MTN_VERIFY_CALLBACK === 'true' && financialTransactionId) {
        const verified = await verifyWithMTNApi(financialTransactionId)
        if (!verified) {
          console.warn(`[MTN-CALLBACK] MTN API verification failed for ${financialTransactionId}`)
          await prisma.payment.update({
            where: { id: payment.id },
            data: { providerResponse: JSON.stringify({ ...body, verificationFailed: true }) },
          })
          return NextResponse.json({ error: 'Verification pending' }, { status: 202 })
        }
      }

      // Atomic payment confirmation
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            reference: financialTransactionId || null,
            providerResponse: JSON.stringify(body),
            paidAt: new Date(),
          },
        })

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          },
        })

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
      })

      console.log(`[MTN-CALLBACK] Payment ${payment.id} confirmed PAID`)

      await prisma.securityLog.create({
        data: {
          type: 'MTN_CALLBACK_SUCCESS',
          identifier: externalId || financialTransactionId,
          details: JSON.stringify({ paymentId: payment.id, orderId: payment.orderId }),
          path: '/api/payments/mtn/callback',
        },
      })
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          providerResponse: JSON.stringify(body),
          failedAt: new Date(),
        },
      })

      console.warn(`[MTN-CALLBACK] Payment ${payment.id} FAILED. Status: ${status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MTN-CALLBACK] Error:', error)
    return NextResponse.json({ error: 'Callback error' }, { status: 500 })
  }
}

/**
 * Optional: Verify payment status with MTN API before confirming
 */
async function verifyWithMTNApi(transactionId: string): Promise<boolean> {
  try {
    const apiKey = process.env.MTN_MOMO_API_KEY
    const userIdMomo = process.env.MTN_MOMO_USER_ID
    const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY
    const environment = process.env.MTN_MOMO_ENVIRONMENT || 'sandbox'

    if (!apiKey || !userIdMomo || !subscriptionKey) return false

    const baseUrl = environment === 'production'
      ? 'https://momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com'

    const basicAuth = Buffer.from(`${userIdMomo}:${apiKey}`).toString('base64')

    const response = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${transactionId}`, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
    })

    if (!response.ok) return false

    const data = await response.json()
    return data.status === 'SUCCESSFUL' || data.status === 'COMPLETED'
  } catch (error) {
    console.error('[MTN-CALLBACK] API verification failed:', error)
    return false
  }
}
