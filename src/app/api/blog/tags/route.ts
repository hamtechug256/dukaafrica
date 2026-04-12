import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/blog/tags
export async function GET() {
  try {
    const tags = await prisma.blogTag.findMany({
      where: {
        BlogPost: { some: { status: 'PUBLISHED' } },
      },
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { BlogPost: { _count: 'desc' } },
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Error fetching blog tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}
