import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch (error) {
    console.error('[BLOG TAG AUTH ERROR]', error)
    return null
  }
}

function generateTagSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET /api/admin/blog/tags
export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tags = await prisma.blogTag.findMany({
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Error fetching blog tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

// POST /api/admin/blog/tags
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug: customSlug } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const slug = customSlug?.trim() || generateTagSlug(name)

    const tag = await prisma.blogTag.create({
      data: {
        name: name.trim(),
        slug,
      },
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating blog tag:', error)
    const msg = error instanceof Error && error.message.includes('Unique') ? 'A tag with this name already exists' : 'Failed to create tag'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/admin/blog/tags
export async function DELETE(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Tag ID required' }, { status: 400 })
    }

    await prisma.blogTag.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blog tag:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
