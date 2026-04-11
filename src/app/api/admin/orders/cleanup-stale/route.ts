/**
 * POST /api/admin/orders/cleanup-stale
 *
 * Admin endpoint to cancel orders that are stuck in PENDING with UNPAID status
 * and restore stock for their items. Used to clean up test orders.
 *
 * Query params:
 *   - olderThanMinutes: cancel orders older than N minutes (default: 30)
 *   - dryRun: if "true", preview what would be cancelled without actually cancelling
 */
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
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

    const { searchParams } = new URL(req.url)
    const olderThanMinutes = parseInt(searchParams.get('olderThanMinutes') || '30')
    const dryRun = searchParams.get('dryRun') === 'true'
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)

    // Find all PENDING + UNPAID orders older than cutoff
    const staleOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: { lt: cutoff },
      },
      include: {
        OrderItem: { select: { id: true, productId: true, variantId: true, quantity: true } },
        Payment: { select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (staleOrders.length === 0) {
      return NextResponse.json({ message: 'No stale orders found', cancelled: 0 })
    }

    if (dryRun) {
      return NextResponse.json({
        message: `DRY RUN: Would cancel ${staleOrders.length} stale order(s)`,
        cancelled: 0,
        orders: staleOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt,
          total: o.total,
          itemCount: o.OrderItem.length,
        })),
      })
    }

    // Cancel orders and restore stock in a single transaction per order
    let cancelled = 0
    const errors: string[] = []

    for (const order of staleOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update order status
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'CANCELLED',
              cancellationReason: 'Auto-cancelled: stale unpaid order cleanup',
            },
          })

          // Update payment status if exists
          if (order.Payment?.id) {
            await tx.payment.update({
              where: { id: order.Payment.id },
              data: { status: 'CANCELLED' },
            })
          }

          // Restore stock for each item
          for (const item of order.OrderItem) {
            if (item.variantId) {
              await tx.productVariant.updateMany({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              })
            }
            await tx.product.updateMany({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
          }
        })
        cancelled++
      } catch (err: any) {
        errors.push(`${order.orderNumber}: ${err.message}`)
      }
    }

    return NextResponse.json({
      message: `Cancelled ${cancelled} of ${staleOrders.length} stale order(s)`,
      cancelled,
      total: staleOrders.length,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error: any) {
    console.error('[Cleanup] Error:', error)
    return NextResponse.json({ error: error.message || 'Cleanup failed' }, { status: 500 })
  }
}
