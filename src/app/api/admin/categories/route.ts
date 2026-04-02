import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

// Super admin emails from environment
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * Helper to ensure user is admin (auto-promotes if email matches)
 */
async function ensureAdmin(userId: string) {
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || ''
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email)

  // Find user in database
  let user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  // Create user if doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        clerkId: userId,
        email: email,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null,
        avatar: clerkUser?.imageUrl,
        role: isSuperAdminEmail ? 'SUPER_ADMIN' : 'BUYER',
        updatedAt: new Date(),
      }
    })
    return user
  }

  // Auto-promote if email matches SUPER_ADMIN_EMAILS
  if (isSuperAdminEmail && user.role !== 'SUPER_ADMIN') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN', updatedAt: new Date() }
    })
    return user
  }

  return user
}

// GET all categories (admin view - includes inactive)
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists and check role from database
    const user = await ensureAdmin(userId)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categories = await prisma.category.findMany({
      include: {
        other_Category: true,
        _count: {
          select: { Product: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    // Transform to match expected format
    const transformedCategories = categories.map((cat) => ({
      ...cat,
      children: cat.other_Category,
      _count: {
        products: cat._count.Product,
      },
    }))

    return NextResponse.json({ categories: transformedCategories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - Create new category
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists and check role from database
    const user = await ensureAdmin(userId)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, description, image, icon, parentId, order, isActive, isFeatured } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        icon: icon || null,
        parentId: parentId || null,
        order: order || 0,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
