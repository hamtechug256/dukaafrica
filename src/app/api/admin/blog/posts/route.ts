import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { generateBlogSlug, calculateReadTime, generateExcerpt } from '@/lib/blog-helpers'

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
    console.error('[BLOG POST AUTH ERROR]', error)
    return null
  }
}

// GET /api/admin/blog/posts
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.categoryId = category
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
          author: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { select: { id: true, name: true, slug: true } },
          _count: { select: { tags: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ])

    return NextResponse.json({ posts, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

// POST /api/admin/blog/posts
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      slug: customSlug,
      content,
      excerpt,
      coverImage,
      coverImageKey,
      status = 'DRAFT',
      isFeatured = false,
      categoryId,
      tagIds = [],
      authorId,
      metaTitle,
      metaDesc,
      keywords,
    } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const slug = customSlug?.trim() || generateBlogSlug(title)
    const readTimeMin = calculateReadTime(content)
    const autoExcerpt = excerpt?.trim() || generateExcerpt(content)

    // Auto-generate SEO if not provided
    const finalMetaTitle = metaTitle?.trim() || (title.length > 60 ? title.substring(0, 57) + '...' : title)
    const finalMetaDesc = metaDesc?.trim() || generateExcerpt(content, 155)
    const finalKeywords = keywords?.trim() || `${title}, DuukaAfrica blog, East Africa marketplace`

    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug,
        content: content.trim(),
        excerpt: autoExcerpt,
        coverImage: coverImage || null,
        coverImageKey: coverImageKey || null,
        status,
        isFeatured,
        readTimeMin,
        metaTitle: finalMetaTitle,
        metaDesc: finalMetaDesc,
        keywords: finalKeywords,
        authorId: authorId || admin.id,
        categoryId: categoryId || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        tags: {
          connect: tagIds.map((id: string) => ({ id })),
        },
      },
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating blog post:', error)
    const msg = error instanceof Error && error.message.includes('Unique') ? 'A post with this slug already exists' : 'Failed to create post'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/admin/blog/posts
export async function PATCH(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const existing = await prisma.blogPost.findUnique({ where: { id }, select: { status: true, publishedAt: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const allowedFields: Record<string, unknown> = {}
    const whitelist = ['title', 'slug', 'content', 'excerpt', 'coverImage', 'coverImageKey', 'status', 'isFeatured', 'categoryId', 'authorId', 'metaTitle', 'metaDesc', 'keywords', 'tagIds']

    for (const key of whitelist) {
      if (key in data) {
        if (key === 'status' && data[key] === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
          allowedFields.publishedAt = new Date()
        }
        if (key === 'content' && typeof data[key] === 'string') {
          allowedFields.readTimeMin = calculateReadTime(data[key])
          // Auto-generate excerpt if content changed but excerpt is empty
          if (!data.excerpt) {
            allowedFields.excerpt = generateExcerpt(data[key])
          }
        }
        if (key === 'excerpt' && data[key] === '__auto__' && typeof data.content === 'string') {
          allowedFields.excerpt = generateExcerpt(data.content)
        }
        // Auto-fill SEO fields when title is set but SEO fields are empty
        if (key === 'title' && typeof data[key] === 'string' && !data.metaTitle) {
          const t = String(data[key])
          allowedFields.metaTitle = t.length > 60 ? t.substring(0, 57) + '...' : t
        }
        allowedFields[key] = data[key]
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: allowedFields,
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    })

    return NextResponse.json({ post })
  } catch (error: unknown) {
    console.error('Error updating blog post:', error)
    const msg = error instanceof Error && error.message.includes('Unique') ? 'A post with this slug already exists' : 'Failed to update post'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/admin/blog/posts
export async function DELETE(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    await prisma.blogPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
