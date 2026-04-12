import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/blog/categories
export async function GET() {
  try {
    const categories = await prisma.blogCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching blog categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
