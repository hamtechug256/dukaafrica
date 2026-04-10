import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * Public API: Get all active categories.
 * 
 * NOTE: Category creation/seeding is handled exclusively by the admin API
 * at /api/admin/categories and /api/seed/categories. This endpoint is read-only.
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        other_Category: {
          where: { isActive: true },
        },
        _count: {
          select: { Product: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[Categories API] Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
