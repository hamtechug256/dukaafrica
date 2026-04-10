/**
 * Ticket Replies API
 *
 * GET  /api/support-tickets/:id/replies  — List replies for a ticket (paginated)
 * POST /api/support-tickets/:id/replies  — Add a reply to a ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthUser() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true, name: true, email: true },
  })
  return user
}

function isAdmin(user: { role: string } | null): boolean {
  return !!user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')
}

// ---------------------------------------------------------------------------
// GET — List replies for a ticket
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    // Verify ticket exists and user has access
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.userId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [replies, total] = await Promise.all([
      prisma.ticketReply.findMany({
        where: { ticketId: id },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticketReply.count({
        where: { ticketId: id },
      }),
    ])

    return NextResponse.json({
      replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing ticket replies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket replies' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Add a reply to a ticket
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { message } = body as { message?: string }

    if (!message || message.trim().length < 1) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Verify ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const isUserOwner = ticket.userId === user.id
    const userIsAdmin = isAdmin(user)

    // Only ticket owner or admin can reply
    if (!isUserOwner && !userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Auto-reopen resolved ticket when user replies
    if (isUserOwner && ticket.status === 'RESOLVED') {
      await prisma.supportTicket.update({
        where: { id },
        data: {
          status: 'OPEN',
          resolvedAt: null,
        },
      })
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: user.id,
        isAdmin: userIsAdmin,
        message: message.trim(),
      },
    })

    // Notify the ticket owner when admin replies
    if (userIsAdmin && !isUserOwner) {
      try {
        await prisma.notification.create({
          data: {
            userId: ticket.userId,
            type: 'SUPPORT_TICKET',
            title: 'New Reply on Your Support Ticket',
            message: `An admin has replied to your ticket "${ticket.subject.substring(0, 60)}"`,
            data: JSON.stringify({ ticketId: id, replyId: reply.id }),
          },
        })
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError)
      }
    }

    // Notify admins when user replies (to an open/in-progress ticket)
    if (!userIsAdmin) {
      try {
        const admins = await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
            isActive: true,
          },
          select: { id: true },
        })

        const notificationPromises = admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'SUPPORT_TICKET',
              title: 'New Reply on Support Ticket',
              message: `User replied to ticket "${ticket.subject.substring(0, 60)}"`,
              data: JSON.stringify({ ticketId: id, replyId: reply.id }),
            },
          })
        )
        await Promise.all(notificationPromises)
      } catch (notificationError) {
        console.error('Failed to create admin notification:', notificationError)
      }
    }

    return NextResponse.json({ reply }, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket reply:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket reply' },
      { status: 500 }
    )
  }
}
