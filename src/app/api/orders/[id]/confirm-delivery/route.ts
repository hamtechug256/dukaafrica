/**
 * API: Confirm Delivery
 *
 * POST /api/orders/[id]/confirm-delivery
 *
 * Allows buyers to confirm delivery of their order.
 * This triggers escrow release to the seller.
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id: orderId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        paymentStatus: true,
        escrowStatus: true,
        deliveryConfirmedAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify user is the buyer
    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can confirm delivery' }, { status: 403 })
    }

    // Check if payment is complete
    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: 'Order is not paid' }, { status: 400 })
    }

    // Check if already confirmed
    if (order.deliveryConfirmedAt) {
      return NextResponse.json({ error: 'Delivery already confirmed' }, { status: 400 })
    }

    // Check if order is in a valid state for confirmation
    // Valid states: SHIPPED, OUT_FOR_DELIVERY, DELIVERED
    const validStatuses = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot confirm delivery for order with status: ${order.status}` },
        { status: 400 }
      )
    }

    // Parse request body for optional photo
    let deliveryPhotoUrl: string | null = null
    try {
      const body = await req.json()
      deliveryPhotoUrl = body.deliveryPhotoUrl || null
    } catch {
      // No body, that's fine
    }

    // Update order with delivery confirmation + escrow release in a single transaction
    // This ensures atomicity: either both succeed or both fail
    try {
      // Fetch escrow transactions before the transaction to know amounts
      const heldEscrows =
        order.escrowStatus === 'HELD'
          ? await prisma.escrowTransaction.findMany({
              where: { orderId, status: 'HELD' },
            })
          : []

      await prisma.$transaction(async (tx) => {
        // a. Update order status to DELIVERED with timestamps
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            deliveryConfirmedAt: new Date(),
            deliveryConfirmedBy: user.id,
            deliveryPhotoUrl,
            ...(heldEscrows.length > 0
              ? { escrowStatus: 'RELEASED', escrowReleasedAt: new Date() }
              : {}),
          },
        })

        // b. If escrow is HELD, update escrow records to RELEASED
        for (const escrow of heldEscrows) {
          await tx.escrowTransaction.update({
            where: { id: escrow.id },
            data: {
              status: 'RELEASED',
              releaseType: 'BUYER_CONFIRMED',
              releasedAt: new Date(),
              releasedBy: user.id,
            },
          })

          // c. Move funds from escrow balance to pending balance on the store
          const sellerAmt = escrow.sellerAmount.toNumber()
          await tx.store.update({
            where: { id: escrow.storeId },
            data: {
              escrowBalance: { decrement: sellerAmt },
              pendingBalance: { increment: sellerAmt },
              successfulDeliveries: { increment: 1 },
              totalOrders: { increment: 1 },
            },
          })
        }
      })
    } catch (txError) {
      console.error('Transaction failed — order NOT marked as delivered:', txError)
      return NextResponse.json(
        { error: 'Failed to confirm delivery. Please try again.' },
        { status: 500 }
      )
    }

    // Create notification for seller (outside transaction — non-fatal if it fails)
    try {
      const escrow = await prisma.escrowTransaction.findFirst({
        where: { orderId },
        select: { storeId: true },
      })

      if (escrow) {
        const store = await prisma.store.findUnique({
          where: { id: escrow.storeId },
          select: { userId: true },
        })

        if (store) {
          await prisma.notification.create({
            data: {
              userId: store.userId,
              type: 'DELIVERY_CONFIRMED',
              title: 'Delivery Confirmed!',
              message: `The buyer has confirmed delivery for order ${order.orderNumber}. Funds have been released to your balance.`,
              data: JSON.stringify({ orderId, orderNumber: order.orderNumber }),
            },
          })
        }
      }
    } catch (notifError) {
      // Non-fatal: notification failure should not break the response
      console.error('Failed to create delivery confirmation notification (non-fatal):', notifError)
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery confirmed successfully',
      order: {
        id: order.id,
        status: 'DELIVERED',
        deliveryConfirmedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error confirming delivery:', error)
    return NextResponse.json({ error: 'Failed to confirm delivery' }, { status: 500 })
  }
}
