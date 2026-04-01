import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/notifications - Get notifications for current user
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
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark as read
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
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, markedAll: true })
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

// POST /api/notifications - Create notification (admin/internal use only)
// SECURITY FIX: Added authentication requirement to prevent unauthorized notification creation
export async function POST(request: NextRequest) {
  try {
    // Check for internal API secret (for server-side calls)
    const internalSecret = request.headers.get('x-internal-secret')
    const isInternalCall = internalSecret && internalSecret === process.env.CRON_SECRET

    // If not an internal call, require admin authentication
    let adminUser = null
    if (!isInternalCall) {
      const { userId } = getAuth(request)
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      adminUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, role: true },
      })

      if (!adminUser || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { userId, type, title, message, data } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate notification type
    const validTypes = [
      'ORDER_PLACED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
      'PAYMENT_RECEIVED', 'REFUND_PROCESSED', 'NEW_PRODUCT', 'PRICE_DROP',
      'BACK_IN_STOCK', 'NEW_REVIEW', 'NEW_MESSAGE', 'SYSTEM', 'PAYOUT_PROCESSED',
      'ORDER_REFUNDED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'LOW_STOCK',
    ]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type', validTypes }, { status: 400 })
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
