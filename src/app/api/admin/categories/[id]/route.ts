import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

/**
 * Sanitize a slug: lowercase, replace non-alphanumeric with hyphens, strip edges.
 * Ensures server-side safety even if frontend sends a dirty slug.
 */
function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')       // strip leading/trailing hyphens
    .replace(/-+/g, '-')           // collapse consecutive hyphens
}

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
  }

  return user
}

// GET single category
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await ensureAdmin(userId)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        other_Category: true,
        _count: {
          select: { Product: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Transform to match expected format
    const transformedCategory = {
      ...category,
      children: category.other_Category,
      _count: {
        products: category._count.Product,
      },
    }

    return NextResponse.json({ category: transformedCategory })
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// PUT - Update category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await ensureAdmin(userId)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, slug, description, image, icon, parentId, order, isActive, isFeatured } = body

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // If slug is being changed, sanitize and check for duplicates
    let sanitizedSlug: string | undefined
    if (slug && slug !== existingCategory.slug) {
      sanitizedSlug = sanitizeSlug(slug)
      if (!sanitizedSlug) {
        return NextResponse.json(
          { error: 'Invalid slug format. Use only letters, numbers, and hyphens.' },
          { status: 400 }
        )
      }
      const duplicateSlug = await prisma.category.findUnique({
        where: { slug: sanitizedSlug },
      })
      if (duplicateSlug) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 400 }
        )
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? existingCategory.name,
        slug: sanitizedSlug || existingCategory.slug,
        description: description !== undefined ? description : existingCategory.description,
        image: image !== undefined ? image : existingCategory.image,
        icon: icon !== undefined ? icon : existingCategory.icon,
        parentId: parentId !== undefined ? parentId : existingCategory.parentId,
        order: order ?? existingCategory.order,
        isActive: isActive ?? existingCategory.isActive,
        isFeatured: isFeatured ?? existingCategory.isFeatured,
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE category
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await ensureAdmin(userId)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${productsCount} products. Move or delete products first.` },
        { status: 400 }
      )
    }

    // Check if category has children
    const childrenCount = await prisma.category.count({
      where: { parentId: id },
    })

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${childrenCount} subcategories. Delete subcategories first.` },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
