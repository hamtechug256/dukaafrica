import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

/**
 * Check if user has admin access
 */
async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch (error) {
    console.error('[BANNER AUTH ERROR]', error)
    return null
  }
}

/**
 * Validate URL - prevent javascript: and other dangerous protocols
 */
function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return true // Empty is valid (optional field)

  // Allow relative URLs
  if (url.startsWith('/')) return true

  // Allow anchor links
  if (url.startsWith('#')) return true

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = url.toLowerCase()
  if (dangerousProtocols.some(p => lowerUrl.startsWith(p))) {
    return false
  }

  // Validate absolute URLs
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// GET /api/admin/banners - List all banners
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const position = searchParams.get('position')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where: any = {}
    if (position) where.position = position
    if (activeOnly) where.isActive = true

    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error('Error fetching banners:', error)
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 })
  }
}

// POST /api/admin/banners - Create banner
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      subtitle,
      image,
      imageMobile,
      link,
      buttonText,
      badgeText,
      badgeColor,
      overlayStyle,
      textPosition,
      position,
      order,
      startDate,
      endDate,
    } = body

    if (!title || !image) {
      return NextResponse.json({ error: 'Title and image are required' }, { status: 400 })
    }

    // Validate link URL
    if (!isValidUrl(link)) {
      return NextResponse.json({ error: 'Invalid link URL' }, { status: 400 })
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle,
        image,
        imageMobile,
        link,
        buttonText,
        badgeText,
        badgeColor,
        overlayStyle: overlayStyle || 'dark',
        textPosition: textPosition || 'left',
        position: position || 'HOME_SLIDER',
        order: order || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    return NextResponse.json({ banner })
  } catch (error) {
    console.error('Error creating banner:', error)
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 })
  }
}

// PATCH /api/admin/banners - Update banner
export async function PATCH(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      console.error('[BANNER PATCH] Admin access denied - auth check returned null')
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Banner ID required' }, { status: 400 })
    }

    // Validate link URL if provided
    if (data.link !== undefined && !isValidUrl(data.link)) {
      return NextResponse.json({ error: 'Invalid link URL' }, { status: 400 })
    }

    // Only include allowed fields in the update
    const allowedFields: Record<string, any> = {}
    const fieldMap: Record<string, any> = {
      title: (v: any) => v,
      subtitle: (v: any) => v,
      image: (v: any) => v,
      imageMobile: (v: any) => v,
      link: (v: any) => v,
      buttonText: (v: any) => v,
      badgeText: (v: any) => v,
      badgeColor: (v: any) => v,
      overlayStyle: (v: any) => v,
      textPosition: (v: any) => v,
      position: (v: any) => v,
      order: (v: any) => (typeof v === 'number' ? v : parseInt(v) || 0),
      isActive: (v: any) => (typeof v === 'boolean' ? v : undefined),
      startDate: (v: any) => (v ? new Date(v) : null),
      endDate: (v: any) => (v ? new Date(v) : null),
    }

    for (const [key, transformer] of Object.entries(fieldMap)) {
      if (key in data) {
        const val = transformer(data[key])
        if (val !== undefined) {
          allowedFields[key] = val
        }
      }
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: allowedFields,
    })

    return NextResponse.json({ banner })
  } catch (error) {
    console.error('Error updating banner:', error)
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 })
  }
}

// PUT /api/admin/banners/reorder - Batch reorder banners
export async function PUT(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { items } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }

    // Validate each item has id and order
    for (const item of items) {
      if (!item.id || typeof item.order !== 'number') {
        return NextResponse.json({ error: 'Each item must have id and order' }, { status: 400 })
      }
    }

    // Batch update using Prisma transaction
    await prisma.$transaction(
      items.map((item: { id: string; order: number }) =>
        prisma.banner.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    return NextResponse.json({ success: true, updated: items.length })
  } catch (error) {
    console.error('Error reordering banners:', error)
    return NextResponse.json({ error: 'Failed to reorder banners' }, { status: 500 })
  }
}

// DELETE /api/admin/banners - Delete banner
export async function DELETE(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Banner ID required' }, { status: 400 })
    }

    await prisma.banner.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting banner:', error)
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 })
  }
}
