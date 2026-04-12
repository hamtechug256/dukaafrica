import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/blog/posts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured') === 'true'

    const where: Record<string, unknown> = { status: 'PUBLISHED' }

    if (category) where.category = { slug: category }
    if (tag) where.tags = { some: { slug: tag } }
    if (featured) where.isFeatured = true
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { select: { id: true, name: true, slug: true } },
          author: { select: { id: true, name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ])

    // Get popular tags (tags with published posts)
    const popularTags = await prisma.blogTag.findMany({
      where: {
        BlogPost: { some: { status: 'PUBLISHED' } },
      },
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { BlogPost: { _count: 'desc' } },
      take: 20,
    })

    return NextResponse.json({
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      popularTags,
    })
  } catch (error) {
    console.error('Error fetching public blog posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
