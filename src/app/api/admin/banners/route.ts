import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/admin/banners - List all banners
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      subtitle,
      image,
      imageMobile,
      link,
      buttonText,
      position,
      order,
      startDate,
      endDate,
    } = body

    if (!title || !image) {
      return NextResponse.json({ error: 'Title and image are required' }, { status: 400 })
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle,
        image,
        imageMobile,
        link,
        buttonText,
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
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Banner ID required' }, { status: 400 })
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })

    return NextResponse.json({ banner })
  } catch (error) {
    console.error('Error updating banner:', error)
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 })
  }
}

// DELETE /api/admin/banners - Delete banner
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
