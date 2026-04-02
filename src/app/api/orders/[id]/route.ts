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

    // TODO: Send notification email to buyer if status changed

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
