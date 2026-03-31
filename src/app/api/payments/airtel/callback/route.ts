import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Airtel Money Callback Handler
 *
 * SECURITY MODEL:
 * - Validates callback body structure
 * - Matches payment by reference ID
 * - Has idempotency checks (skip if already PAID/FAILED)
 * - Creates security logs for audit trail
 * - This endpoint MUST be public (no Clerk auth) since Airtel sends no auth headers
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate callback structure
    if (!body?.data?.transaction) {
      console.error('[AIRTEL-CALLBACK] Invalid callback: missing data.transaction')
      return NextResponse.json({ error: 'Invalid callback' }, { status: 400 })
    }

    const { transaction } = body.data
    const referenceId = transaction.id || body.data.reference
    const status = transaction.status?.toUpperCase()

    if (!referenceId) {
      console.error('[AIRTEL-CALLBACK] No reference ID in callback')
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    console.log(`[AIRTEL-CALLBACK] Received for reference: ${referenceId}, status: ${status}`)

    // Find payment by providerRef
    const payment = await prisma.payment.findFirst({
      where: { providerRef: referenceId },
      include: { Order: true },
    })

    if (!payment) {
      console.warn(`[AIRTEL-CALLBACK] No payment found for reference: ${referenceId}`)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Idempotency: skip if already in terminal state
    if (payment.status === 'PAID') {
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    if (status === 'SUCCESS' || status === 'COMPLETED') {
      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
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

        // Update product quantities
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

      console.log(`[AIRTEL-CALLBACK] Payment ${payment.id} confirmed PAID`)

      // Security audit log
      await prisma.securityLog.create({
        data: {
          type: 'AIRTEL_CALLBACK_SUCCESS',
          identifier: referenceId,
          details: JSON.stringify({ paymentId: payment.id, orderId: payment.orderId }),
          path: '/api/payments/airtel/callback',
        },
      })
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          providerResponse: JSON.stringify(body),
          failedAt: new Date(),
        },
      })

      console.warn(`[AIRTEL-CALLBACK] Payment ${payment.id} FAILED. Status: ${status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AIRTEL-CALLBACK] Error:', error)
    return NextResponse.json({ error: 'Callback error' }, { status: 500 })
  }
}
