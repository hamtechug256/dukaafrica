/**
 * POST /api/admin/orders/simulate-payment
 *
 * Sandbox-only: Simulates a successful Pesapal payment for testing.
 * Bypasses Pesapal API verification (sandbox payments never complete).
 * Runs the same downstream logic as the IPN handler: confirms payment,
 * updates order, creates escrow, increments purchase counts.
 *
 * ONLY works when Pesapal environment is "sandbox".
 * Requires ADMIN or SUPER_ADMIN role.
 *
 * Body: { orderId?: string }  — if omitted, uses the most recent PENDING order
 */
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createEscrowHold } from '@/lib/escrow'
import { Prisma } from '@prisma/client'

function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify we're in sandbox mode
    const settings = await prisma.platformSettings.findFirst({
      select: { pesapalEnvironment: true },
    })
    const env = settings?.pesapalEnvironment || process.env.PESAPAL_ENV || ''
    if (env !== 'sandbox') {
      return NextResponse.json(
        { error: 'This endpoint only works in sandbox mode' },
        { status: 403 }
      )
    }

    // Find the order
    let orderId: string | undefined
    try {
      const body = await request.json()
      orderId = body.orderId
    } catch { /* no body — use latest PENDING */ }

    const whereClause = orderId
      ? { id: orderId, status: 'PENDING', paymentStatus: 'PENDING' }
      : { status: 'PENDING', paymentStatus: 'PENDING' }

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        OrderItem: true,
        Payment: true,
        User: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!order) {
      return NextResponse.json({
        error: 'No PENDING order found' + (orderId ? ` with id ${orderId}` : ''),
      }, { status: 404 })
    }

    if (!order.Payment) {
      return NextResponse.json({
        error: `Order ${order.orderNumber} has no payment record`,
      }, { status: 400 })
    }

    const payment = order.Payment

    // ── Step 1: Update payment to PAID (atomic, idempotent) ──
    const { count: paymentUpdated } = await prisma.payment.updateMany({
      where: { id: payment.id, status: { not: 'PAID' } },
      data: {
        status: 'PAID',
        provider: 'PESAPAL_SANDBOX_SIMULATED',
        paidAt: new Date(),
        providerResponse: JSON.stringify({
          simulated: true,
          simulatedAt: new Date().toISOString(),
          orderTrackingId: payment.reference || order.orderNumber,
        }),
      },
    })

    if (paymentUpdated === 0) {
      return NextResponse.json({
        message: `Order ${order.orderNumber} is already paid`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        skipped: true,
      })
    }

    // ── Step 2: Group items by store ──
    const storeTotals = new Map<string, number>()
    for (const item of order.OrderItem) {
      const existing = storeTotals.get(item.storeId) || 0
      storeTotals.set(item.storeId, existing + toNum(item.total))
    }

    // ── Step 3: Atomic core — order confirmation + purchase counts ──
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      })

      for (const [storeId, storeTotal] of storeTotals) {
        const storeItems = order.OrderItem.filter(item => item.storeId === storeId)

        for (const item of storeItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { purchaseCount: { increment: item.quantity } },
          })
        }

        await tx.store.update({
          where: { id: storeId },
          data: { totalSales: { increment: storeTotal } },
        })
      }
    })

    // ── Step 4: Coupon usage ──
    if (order.couponId) {
      try {
        await prisma.coupon.update({
          where: { id: order.couponId },
          data: { usageCount: { increment: 1 } },
        })
      } catch {
        // Non-fatal
      }
    }

    // ── Step 5: Escrow creation ──
    const escrowResults: { storeId: string; success: boolean; escrowId?: string }[] = []

    for (const [storeId, storeTotal] of storeTotals) {
      try {
        const store = await prisma.store.findUnique({
          where: { id: storeId },
          select: {
            id: true,
            userId: true,
            verificationTier: true,
            verificationStatus: true,
            commissionRate: true,
            country: true,
          },
        })
        if (!store) continue

        const totalProductSubtotal = order.subtotal ? toNum(order.subtotal) : storeTotal
        const storeProductShare = totalProductSubtotal > 0 ? storeTotal / totalProductSubtotal : 1
        const orderShippingFee = toNum(order.shippingFee) || 0

        const platformSettings2 = await prisma.platformSettings.findFirst({
          select: { shippingMarkupPercent: true },
        })
        const shippingMarkup = platformSettings2 ? toNum(platformSettings2.shippingMarkupPercent) : 5
        const sellerShippingShare = (100 - shippingMarkup) / 100
        const sellerShippingEarnings = Math.round(orderShippingFee * sellerShippingShare * storeProductShare)

        const escrowResult = await createEscrowHold({
          orderId: order.id,
          storeId: store.id,
          buyerId: order.userId,
          grossAmount: storeTotal,
          shippingEarnings: sellerShippingEarnings,
          currency: order.currency,
          store: {
            verificationTier: store.verificationTier,
            verificationStatus: store.verificationStatus,
            commissionRate: toNum(store.commissionRate),
          },
        })

        escrowResults.push({
          storeId,
          success: escrowResult.success,
          escrowId: escrowResult.escrowId,
        })
      } catch (err) {
        console.error(`Escrow creation failed for store ${storeId}:`, err)
        escrowResults.push({ storeId, success: false })
      }
    }

    return NextResponse.json({
      message: `Simulated successful payment for order ${order.orderNumber}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: toNum(order.total),
      currency: order.currency,
      paymentId: payment.id,
      escrow: escrowResults,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Simulation failed'
    console.error('[Simulate Payment] Error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
