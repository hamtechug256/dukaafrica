import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/support - Get support tickets
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'

    const where: any = isAdmin ? {} : { userId: user.id }

    if (status && status !== 'all') {
      where.status = status
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

// POST /api/support - Create support ticket
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { orderId, subject, message, priority, category } = body

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        orderId,
        subject,
        message,
        priority: priority || 'NORMAL',
        category: category || 'OTHER',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create notification for admin
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    })

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: 'SYSTEM',
        title: 'New Support Ticket',
        message: `New ticket: ${subject}`,
        data: JSON.stringify({ ticketId: ticket.id }),
      })),
    })

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}

// PATCH /api/support - Update ticket status or add reply
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { ticketId, status, reply, isAdminReply, attachments } = body

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'

    // Update status
    if (status) {
      const updateData: any = { status }
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date()
      }

      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
      })
    }

    // Add reply
    if (reply) {
      await prisma.ticketReply.create({
        data: {
          ticketId,
          userId: user.id,
          isAdmin: isAdminReply || isAdmin,
          message: reply,
          attachments: attachments ? JSON.stringify(attachments) : undefined,
        },
      })

      // Notify the other party
      const notifyUserId = isAdmin ? ticket.userId : (await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true },
      }))?.id

      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: 'SYSTEM',
            title: 'Ticket Reply',
            message: `New reply on ticket: ${ticket.subject}`,
            data: JSON.stringify({ ticketId }),
          },
        })
      }
    }

    const updatedTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
