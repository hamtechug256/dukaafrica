/**
 * Public Document Browsing API
 *
 * GET /api/documents — List published documents
 *   Filters: category, targetAudience
 *   Returns only public-safe fields (no createdBy/updatedBy)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const targetAudience = searchParams.get('targetAudience')
    const featured = searchParams.get('featured')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const where: any = { isPublished: true }

    if (category) {
      where.category = category
    }

    // Build targetAudience filter — documents tagged "ALL" are visible to everyone
    if (!targetAudience) {
      // No filter: show everything
      where.targetAudience = { in: ['ALL', 'SELLERS', 'BUYERS'] }
    } else if (targetAudience === 'SELLERS') {
      where.targetAudience = { in: ['ALL', 'SELLERS'] }
    } else if (targetAudience === 'BUYERS') {
      where.targetAudience = { in: ['ALL', 'BUYERS'] }
    } else {
      where.targetAudience = { in: ['ALL', targetAudience] }
    }

    if (featured === 'true') {
      where.isFeatured = true
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          slug: true,
          category: true,
          fileType: true,
          fileSize: true,
          thumbnailUrl: true,
          downloadCount: true,
          isFeatured: true,
          targetAudience: true,
          createdAt: true,
        },
      }),
      prisma.document.count({ where }),
    ])

    // Format file size for display
    const formattedDocs = documents.map((doc) => ({
      ...doc,
      fileSizeFormatted: formatFileSize(doc.fileSize),
    }))

    return NextResponse.json({
      documents: formattedDocs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching public documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
