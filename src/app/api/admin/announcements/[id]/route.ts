/**
 * Admin Announcement Detail API
 *
 * GET    /api/admin/announcements/[id]  — Get single announcement
 * PATCH  /api/admin/announcements/[id]  — Update announcement
 * DELETE /api/admin/announcements/[id]  — Delete announcement
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
// GET — Single announcement
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Get creator name
    const creator = await prisma.user.findUnique({
      where: { id: announcement.createdBy },
      select: { name: true },
    })

    return NextResponse.json({
      announcement: {
        ...announcement,
        creatorName: creator?.name || 'Unknown',
        isExpired: announcement.expiresAt ? new Date(announcement.expiresAt) < new Date() : false,
      },
    })
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update announcement
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
    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      title,
      content,
      type,
      targetAudience,
      targetCountry,
      isActive,
      expiresAt,
    } = body as {
      title?: string
      content?: string
      type?: string
      targetAudience?: string
      targetCountry?: string | null
      isActive?: boolean
      expiresAt?: string | null
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        return NextResponse.json(
          { error: 'Title must be at least 3 characters' },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length < 10) {
        return NextResponse.json(
          { error: 'Content must be at least 10 characters' },
          { status: 400 }
        )
      }
      updateData.content = content.trim()
    }

    if (type !== undefined) {
      const allowed = ['INFO', 'WARNING', 'MAINTENANCE', 'PROMOTION']
      if (!allowed.includes(type)) {
        return NextResponse.json(
          { error: 'Invalid type. Allowed: ' + allowed.join(', ') },
          { status: 400 }
        )
      }
      updateData.type = type
    }

    if (targetAudience !== undefined) {
      const allowed = ['ALL', 'SELLERS', 'BUYERS']
      if (!allowed.includes(targetAudience)) {
        return NextResponse.json(
          { error: 'Invalid target audience. Allowed: ' + allowed.join(', ') },
          { status: 400 }
        )
      }
      updateData.targetAudience = targetAudience
    }

    if (targetCountry !== undefined) {
      if (targetCountry !== null) {
        const allowed = ['UGANDA', 'KENYA', 'TANZANIA', 'RWANDA', 'SOUTH_SUDAN', 'BURUNDI']
        if (!allowed.includes(targetCountry)) {
          return NextResponse.json(
            { error: 'Invalid country. Allowed: ' + allowed.join(', ') },
            { status: 400 }
          )
        }
      }
      updateData.targetCountry = targetCountry
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updateData.expiresAt = null
      } else {
        const expiryDate = new Date(expiresAt)
        if (isNaN(expiryDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid expiry date format' },
            { status: 400 }
          )
        }
        updateData.expiresAt = expiryDate
      }
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete announcement
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Soft-delete related notifications (mark as read and add deletion note)
    await prisma.notification.updateMany({
      where: {
        type: 'ANNOUNCEMENT',
        data: { contains: existing.id },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    await prisma.announcement.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}
