import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch single order by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch order with all relations
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        OrderItem: {
          include: {
            Product: {
              include: {
                Store: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
        Store: {
          select: { id: true, name: true, slug: true, User: { select: { clerkId: true } } },
        },
        User: {
          select: { id: true, clerkId: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check access rights
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
    const isBuyer = order.userId === user.id
    const isSeller = order.Store?.User?.clerkId === userId

    if (!isAdmin && !isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Protect sensitive fields: only buyer sees own email, only admin sees clerkId
    if (!isAdmin && !isBuyer) {
      delete (order.User as Record<string, unknown>).email
    }
    if (!isAdmin) {
      delete (order.User as Record<string, unknown>).clerkId
    }

    // Return order with appropriate visibility
    return NextResponse.json({
      order,
      isBuyer,
      isSeller,
      isAdmin,
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// PUT - Update order status
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determine admin status before query for conditional field selection
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role)

    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        Store: { select: { id: true, User: { select: { clerkId: true } } } },
        User: { select: { id: true, email: isAdmin, firstName: true } },
        OrderItem: {
          select: { productId: true, variantId: true, quantity: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check access rights
    const isSeller = order.Store?.User?.clerkId === userId

    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const {
      status,
      busCompany,
      busNumberPlate,
      conductorPhone,
      pickupLocation,
      deliveredAt,
      cancellationReason,
      notes,
    } = body

    // Build update data
    const updateData: any = {}
    
    if (status) {
      updateData.status = status
    }
    
    if (busCompany !== undefined) {
      updateData.busCompany = busCompany
    }
    
    if (busNumberPlate !== undefined) {
      updateData.busNumberPlate = busNumberPlate
    }
    
    if (conductorPhone !== undefined) {
      updateData.conductorPhone = conductorPhone
    }
    
    if (pickupLocation !== undefined) {
      updateData.pickupLocation = pickupLocation
    }
    
    if (deliveredAt !== undefined) {
      updateData.deliveredAt = deliveredAt ? new Date(deliveredAt) : null
    }
    
    if (cancellationReason !== undefined) {
      updateData.cancellationReason = cancellationReason
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        OrderItem: {
          include: {
            Product: {
              include: { Store: true },
            },
          },
        },
        Store: true,
      },
    })

    // STOCK RESTORE: When order is cancelled, restore reserved stock to products
    // Stock was decremented at order creation (reservation model). If the order is
    // cancelled before shipment, the stock should be returned to the products.
    // Note: IPN FAILED/CANCELLED handlers already restore stock for payment failures.
    // This covers admin-initiated cancellations for paid/pending orders.
    if (status === 'CANCELLED' && order.OrderItem && order.OrderItem.length > 0) {
      // Only restore stock if the order was NOT already refunded (refundEscrow handles its own stock restore)
      if (order.escrowStatus !== 'REFUNDED') {
        try {
          for (const item of order.OrderItem) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { quantity: { increment: item.quantity } },
            })
            if (item.variantId) {
              await prisma.productVariant.update({
                where: { id: item.variantId },
                data: { quantity: { increment: item.quantity } },
              })
            }
          }
          console.log(`[Order Cancel] Stock restored for order ${order.orderNumber} (${order.OrderItem.length} items)`)
        } catch (stockErr) {
          console.error(`[Order Cancel] Failed to restore stock for order ${order.orderNumber}:`, stockErr)
          // Non-fatal: the cancellation itself succeeded, stock restore is best-effort
        }
      }
    }

    // Send notification to buyer if status changed
    if (status && order.User?.id) {
      try {
        const notifType = status === 'CANCELLED' ? 'ORDER_CANCELLED' : 'ORDER_UPDATE'
        const notifTitle = status === 'CANCELLED' ? 'Order Cancelled' : 'Order Updated'
        const notifMessage = status === 'CANCELLED'
          ? `Your order ${order.orderNumber} has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`
          : `Your order ${order.orderNumber} status has been updated to ${status}.`

        await prisma.notification.create({
          data: {
            userId: order.User.id,
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            data: JSON.stringify({ orderId: id, orderNumber: order.orderNumber, newStatus: status }),
          },
        })
      } catch (notifErr) {
        console.error('Failed to create order status notification (non-fatal):', notifErr)
      }
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
