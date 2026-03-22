import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/banners - Get all banners
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const position = searchParams.get('position')
    const activeOnly = searchParams.get('active') === 'true'

    const where: any = {}

    if (position) {
      where.position = position
    }

    if (activeOnly) {
      where.isActive = true
      const now = new Date()
      where.OR = [
        { startDate: null, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
      ]
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ position: 'asc' }, { order: 'asc' }],
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error('Error fetching banners:', error)
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 })
  }
}

// POST /api/banners - Create banner (Admin only)
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      subtitle,
      image,
      imageMobile,
      link,
      buttonText,
      position = 'HOME_SLIDER',
      order = 0,
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
        position,
        order,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    })

    return NextResponse.json({ banner })
  } catch (error) {
    console.error('Error creating banner:', error)
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 })
  }
}

// PATCH /api/banners - Update banner
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Banner ID required' }, { status: 400 })
    }

    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate)
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate)
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ banner })
  } catch (error) {
    console.error('Error updating banner:', error)
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 })
  }
}

// DELETE /api/banners - Delete banner
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await request.json()

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
