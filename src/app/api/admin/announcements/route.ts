/**
 * Admin Announcement API
 *
 * GET  /api/admin/announcements  — List announcements (admin only)
 * POST /api/admin/announcements  — Create announcement (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['INFO', 'WARNING', 'MAINTENANCE', 'PROMOTION'] as const
const ALLOWED_AUDIENCES = ['ALL', 'SELLERS', 'BUYERS'] as const
const ALLOWED_COUNTRIES = ['UGANDA', 'KENYA', 'TANZANIA', 'RWANDA', 'SOUTH_SUDAN', 'BURUNDI'] as const

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
// GET — List announcements
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const type = searchParams.get('type')
    const targetAudience = searchParams.get('targetAudience')
    const isActive = searchParams.get('isActive')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (type) where.type = type
    if (targetAudience) where.targetAudience = targetAudience
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ])

    // Enrich with creator name
    const creatorIds = [...new Set(announcements.map((a) => a.createdBy))]
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true },
    })
    const creatorMap = new Map(creators.map((c) => [c.id, c.name]))

    const enriched = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      targetAudience: a.targetAudience,
      targetCountry: a.targetCountry,
      isActive: a.isActive,
      createdAt: a.createdAt,
      expiresAt: a.expiresAt,
      createdBy: a.createdBy,
      creatorName: creatorMap.get(a.createdBy) || 'Unknown',
      isExpired: a.expiresAt ? new Date(a.expiresAt) < new Date() : false,
    }))

    return NextResponse.json({
      announcements: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Create announcement
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limit: 10 announcement creations per minute for admin
    const rateLimit = await checkRateLimit('announcement_create', user.id, 10, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many announcement creation attempts. Please try again later.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      title,
      content,
      type = 'INFO',
      targetAudience = 'ALL',
      targetCountry,
      expiresAt,
    } = body as {
      title?: string
      content?: string
      type?: string
      targetAudience?: string
      targetCountry?: string
      expiresAt?: string
    }

    // Validate required fields
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'Title is required and must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Content is required and must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json(
        { error: 'Invalid type. Allowed: ' + ALLOWED_TYPES.join(', ') },
        { status: 400 }
      )
    }

    if (!ALLOWED_AUDIENCES.includes(targetAudience as (typeof ALLOWED_AUDIENCES)[number])) {
      return NextResponse.json(
        { error: 'Invalid target audience. Allowed: ' + ALLOWED_AUDIENCES.join(', ') },
        { status: 400 }
      )
    }

    if (targetCountry && !ALLOWED_COUNTRIES.includes(targetCountry as (typeof ALLOWED_COUNTRIES)[number])) {
      return NextResponse.json(
        { error: 'Invalid country. Allowed: ' + ALLOWED_COUNTRIES.join(', ') },
        { status: 400 }
      )
    }

    if (expiresAt) {
      const expiryDate = new Date(expiresAt)
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date format' },
          { status: 400 }
        )
      }
    }

    // Create the announcement
    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        type,
        targetAudience,
        targetCountry: targetCountry || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user.id,
      },
    })

    // Broadcast notifications to matching users in batches
    try {
      // Build user query based on target audience and country
      const userWhere: Record<string, unknown> = { isActive: true }

      if (targetAudience === 'SELLERS') {
        // Sellers are users with role SELLER or who own a Store
        userWhere.OR = [
          { role: 'SELLER' },
          { Store: { isNot: null } },
        ]
      } else if (targetAudience === 'BUYERS') {
        userWhere.role = 'BUYER'
      }

      if (targetCountry) {
        userWhere.country = targetCountry
      }

      // Fetch matching user IDs
      const matchingUsers = await prisma.user.findMany({
        where: userWhere,
        select: { id: true },
      })

      // Create notifications in batches of 100
      const BATCH_SIZE = 100
      for (let i = 0; i < matchingUsers.length; i += BATCH_SIZE) {
        const batch = matchingUsers.slice(i, i + BATCH_SIZE)
        await prisma.notification.createMany({
          data: batch.map((u) => ({
            userId: u.id,
            type: 'ANNOUNCEMENT',
            title: announcement.title,
            message: announcement.content.substring(0, 200),
            data: JSON.stringify({
              announcementId: announcement.id,
              type: announcement.type,
            }),
          })),
        })
      }
    } catch (notificationError) {
      // Non-fatal: log but don't fail the request
      console.error('Failed to broadcast announcement notifications:', notificationError)
    }

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
