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
    console.error('[BLOG CATEGORY AUTH ERROR]', error)
    return null
  }
}

function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET /api/admin/blog/categories
export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categories = await prisma.blogCategory.findMany({
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching blog categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/admin/blog/categories
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug: customSlug, description, image, order = 0, isActive = true } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const slug = customSlug?.trim() || generateCategorySlug(name)

    const category = await prisma.blogCategory.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: image || null,
        order,
        isActive,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating blog category:', error)
    const msg = error instanceof Error && error.message.includes('Unique') ? 'A category with this name or slug already exists' : 'Failed to create category'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/admin/blog/categories
export async function PATCH(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    const allowedFields: Record<string, unknown> = {}
    const whitelist = ['name', 'slug', 'description', 'image', 'order', 'isActive']

    for (const key of whitelist) {
      if (key in data) {
        allowedFields[key] = data[key]
      }
    }

    const category = await prisma.blogCategory.update({
      where: { id },
      data: allowedFields,
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating blog category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE /api/admin/blog/categories
export async function DELETE(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    const postCount = await prisma.blogPost.count({ where: { categoryId: id } })
    if (postCount > 0) {
      return NextResponse.json({ error: `Cannot delete category with ${postCount} post(s). Move or delete posts first.` }, { status: 400 })
    }

    await prisma.blogCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blog category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
