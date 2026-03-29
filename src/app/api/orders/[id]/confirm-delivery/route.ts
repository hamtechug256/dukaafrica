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
import { releaseEscrow } from '@/lib/escrow'

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

    // Update order with delivery confirmation
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryConfirmedAt: new Date(),
        deliveryConfirmedBy: user.id,
        deliveryPhotoUrl,
      },
    })

    // Release escrow if held
    if (order.escrowStatus === 'HELD') {
      const releaseResult = await releaseEscrow({
        orderId,
        releaseType: 'BUYER_CONFIRMED',
      })

      if (!releaseResult.success) {
        console.error('Failed to release escrow:', releaseResult.error)
        // Don't fail the request - order is still confirmed
      }
    }

    // Create notification for seller
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
