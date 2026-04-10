/**
 * Single Support Ticket API
 *
 * GET   /api/support-tickets/:id  — Get ticket with all replies
 * PATCH /api/support-tickets/:id  — Update ticket status (admin only)
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

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['REOPENED', 'CLOSED'],
  REOPENED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: [],
}

// ---------------------------------------------------------------------------
// GET — Single ticket with replies
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        TicketReply: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Only ticket owner or admin can access
    if (ticket.userId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Include user info for replies
    const replyUserIds = ticket.TicketReply
      .map((r) => r.userId)
      .filter((id): id is string => !!id)
    const uniqueUserIds = [...new Set([...replyUserIds, ticket.userId])]

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, name: true, email: true },
    })

    const userMap = new Map(users.map((u) => [u.id, u]))

    return NextResponse.json({
      ticket: {
        ...ticket,
        TicketReply: ticket.TicketReply.map((reply) => ({
          ...reply,
          user: reply.userId ? userMap.get(reply.userId) : null,
        })),
        user: userMap.get(ticket.userId),
      },
    })
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support ticket' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update ticket status (admin only)
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body as { status?: string }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const validStatuses = Object.keys(ALLOWED_TRANSITIONS)
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if transition is allowed
    const allowedNextStatuses = ALLOWED_TRANSITIONS[ticket.status] || []
    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${ticket.status} to ${status}. Allowed: ${allowedNextStatuses.join(', ') || 'none'}`,
        },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = { status }

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date()
    }

    if (status === 'REOPENED') {
      updateData.status = 'OPEN'
      updateData.resolvedAt = null
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
    })

    // Notify ticket owner on status change
    try {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: 'SUPPORT_TICKET',
          title: 'Support Ticket Update',
          message: `Your support ticket "${ticket.subject.substring(0, 60)}" has been updated to: ${status === 'REOPENED' ? 'OPEN' : status}`,
          data: JSON.stringify({ ticketId: id, status: status === 'REOPENED' ? 'OPEN' : status }),
        },
      })
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
    }

    return NextResponse.json({ ticket: updatedTicket })
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update support ticket' },
      { status: 500 }
    )
  }
}
