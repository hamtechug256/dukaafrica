import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

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
    const { userId } = await auth()
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
      // M2 FIX: Verify ownership - only mark notifications belonging to this user
      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId: user.id },
      })

      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }

      await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
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

// POST /api/notifications - Create notification (internal/server-side only)
// C2 FIX: Require admin auth or internal API secret
export async function POST(request: NextRequest) {
  try {
    // Option 1: Internal API secret (for server-to-server calls)
    const internalSecret = request.headers.get('x-internal-api-secret')
    if (internalSecret === process.env.INTERNAL_API_SECRET) {
      const body = await request.json()
      const { userId, type, title, message, data } = body

      if (!userId || !type || !title || !message) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
    }

    // Option 2: Admin authentication (for admin-initiated notifications)
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })

    if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { targetUserId, type, title, message, data } = body

    if (!targetUserId || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields: targetUserId, type, title, message' }, { status: 400 })
    }

    // Validate notification type
    const validTypes = ['ORDER_UPDATE', 'PAYMENT', 'ESCROW_HELD', 'ESCROW_RELEASED', 'REFUND_PROCESSED', 'DISPUTE', 'SYSTEM', 'PROMOTION']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
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
