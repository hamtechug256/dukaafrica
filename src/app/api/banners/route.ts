/**
 * Public API: Get active banners for homepage display
 * GET /api/banners?position=HOME_SLIDER
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')

    const now = new Date()

    const where: any = {
      isActive: true,
    }

    // Only include banners that are within their scheduled date range
    // If no startDate/endDate set, always show
    where.OR = [
      { startDate: null, endDate: null },
      { startDate: null, endDate: { gte: now } },
      { startDate: { lte: now }, endDate: null },
      { startDate: { lte: now }, endDate: { gte: now } },
    ]

    if (position) {
      where.position = position
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        subtitle: true,
        image: true,
        imageMobile: true,
        link: true,
        buttonText: true,
        position: true,
        order: true,
      },
    })

    return NextResponse.json({ banners })
  } catch (error: any) {
    // Log the actual error for debugging
    console.error('[BANNERS API ERROR]', error?.message || error)

    // Check if it's a "table doesn't exist" error
    const errorMsg = error?.message?.toLowerCase() || ''
    if (errorMsg.includes('does not exist') || errorMsg.includes('relation') || errorMsg.includes('table')) {
      return NextResponse.json({ banners: [], error: 'Banner table not yet created' })
    }

    // For other errors, still return empty but include error info in debug mode
    return NextResponse.json({ banners: [] })
  }
}
