/**
 * Support Ticket API
 *
 * GET  /api/support-tickets  — List tickets for authenticated user (admin gets all)
 * POST /api/support-tickets  — Create a new support ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_CATEGORIES = [
  'PAYMENT_ISSUE',
  'ORDER_PROBLEM',
  'ACCOUNT_ISSUE',
  'STORE_SETTINGS',
  'SHIPPING',
  'PRODUCT_QUESTION',
  'OTHER',
] as const

const ALLOWED_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const

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
// GET — List tickets
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const userIdFilter = searchParams.get('userId')

    // Build where clause
    const where: Record<string, unknown> = {}

    // Non-admin users only see their own tickets
    if (!isAdmin(user)) {
      where.userId = user.id
    } else {
      // Admin can filter by userId
      if (userIdFilter) {
        where.userId = userIdFilter
      }
    }

    if (status) where.status = status
    if (category) where.category = category
    if (priority && isAdmin(user)) where.priority = priority

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          TicketReply: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              createdAt: true,
              isAdmin: true,
            },
          },
          _count: {
            select: { TicketReply: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ])

    // Enrich with latest reply preview
    const enriched = tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      userId: ticket.userId,
      orderId: ticket.orderId,
      replyCount: ticket._count.TicketReply,
      latestReply: ticket.TicketReply[0]
        ? {
            message: ticket.TicketReply[0].message.substring(0, 100),
            createdAt: ticket.TicketReply[0].createdAt,
            isAdmin: ticket.TicketReply[0].isAdmin,
          }
        : null,
    }))

    return NextResponse.json({
      tickets: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new ticket
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5 ticket creations per minute
    const rateLimit = await checkRateLimit('ticket_create', user.id, 5, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many ticket creation attempts. Please try again later.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      subject,
      message,
      category,
      orderId,
      priority = 'NORMAL',
    } = body as {
      subject?: string
      message?: string
      category?: string
      orderId?: string
      priority?: string
    }

    // Validate required fields
    if (!subject || subject.trim().length < 5) {
      return NextResponse.json(
        { error: 'Subject is required and must be at least 5 characters' },
        { status: 400 }
      )
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message is required and must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category as typeof ALLOWED_CATEGORIES[number])) {
      return NextResponse.json(
        { error: 'Invalid category. Allowed: ' + ALLOWED_CATEGORIES.join(', ') },
        { status: 400 }
      )
    }

    if (!ALLOWED_PRIORITIES.includes(priority as typeof ALLOWED_PRIORITIES[number])) {
      return NextResponse.json(
        { error: 'Invalid priority. Allowed: ' + ALLOWED_PRIORITIES.join(', ') },
        { status: 400 }
      )
    }

    // If orderId is provided, verify it belongs to the user
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      })
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      if (order.userId !== user.id && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'This order does not belong to you' },
          { status: 403 }
        )
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        orderId: orderId || null,
      },
    })

    // Create notification for all admin users
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
            title: 'New Support Ticket',
            message: `A new support ticket has been created: "${subject.trim().substring(0, 60)}"`,
            data: JSON.stringify({ ticketId: ticket.id }),
          },
        })
      )
      await Promise.all(notificationPromises)
    } catch (notificationError) {
      // Non-fatal: log but don't fail the request
      console.error('Failed to create admin notification:', notificationError)
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}
