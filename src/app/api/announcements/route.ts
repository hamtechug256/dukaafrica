/**
 * Public Announcements API
 *
 * GET /api/announcements  — Returns active, non-expired announcements
 *                             for the current user (or public if unauthenticated)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// GET — Active announcements for current user
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const now = new Date()

    // Base filter: active and not expired
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (!userId) {
      // Unauthenticated users only see announcements targeted at ALL with no country filter
      where.targetAudience = 'ALL'
      where.targetCountry = null
    } else {
      // Authenticated users: filter by role and country
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, role: true, country: true },
      })

      if (!user) {
        // If user not in DB, treat as unauthenticated
        where.targetAudience = 'ALL'
        where.targetCountry = null
      } else {
        // Filter by audience matching user role
        // ALL is always shown, SELLERS shown to sellers, BUYERS shown to buyers
        const roleConditions = [{ targetAudience: 'ALL' }]
        if (user.role === 'SELLER') {
          roleConditions.push({ targetAudience: 'SELLERS' })
        }
        if (user.role === 'BUYER') {
          roleConditions.push({ targetAudience: 'BUYERS' })
        }
        // ADMIN/SUPER_ADMIN see all
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          roleConditions.push({ targetAudience: 'SELLERS' })
          roleConditions.push({ targetAudience: 'BUYERS' })
        }

        // Filter by country: show announcements with no country filter OR matching user country
        const countryConditions: Array<Record<string, unknown>> = [{ targetCountry: null }]
        if (user.country) {
          countryConditions.push({ targetCountry: user.country })
        }

        where.OR = roleConditions.map((roleCond) => ({
          ...roleCond,
          OR: countryConditions,
        }))
      }
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Filter out expired announcements in application logic
    // (since Prisma can't easily do "expiresAt IS NULL OR expiresAt > now" with the complex OR above)
    const activeAnnouncements = announcements.filter((a) => {
      if (a.expiresAt && new Date(a.expiresAt) < now) {
        return false
      }
      return true
    })

    // Get creator names
    const creatorIds = [...new Set(activeAnnouncements.map((a) => a.createdBy))]
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true },
    })
    const creatorMap = new Map(creators.map((c) => [c.id, c.name]))

    const enriched = activeAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      targetAudience: a.targetAudience,
      targetCountry: a.targetCountry,
      createdAt: a.createdAt,
      expiresAt: a.expiresAt,
    }))

    return NextResponse.json({ announcements: enriched })
  } catch (error) {
    console.error('Error fetching public announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}
