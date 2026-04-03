/**
 * Public Document Detail API
 *
 * GET /api/documents/[slug] — Get published document by slug
 *   Increments downloadCount
 *   Returns document details + fileUrl for download
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const document = await prisma.document.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        category: true,
        fileType: true,
        fileSize: true,
        fileUrl: true,
        thumbnailUrl: true,
        downloadCount: true,
        isFeatured: true,
        isPublished: true,
        targetAudience: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!document || !document.isPublished) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Increment download count
    await prisma.document.update({
      where: { id: document.id },
      data: { downloadCount: { increment: 1 } },
    })

    return NextResponse.json({
      document: {
        ...document,
        fileSizeFormatted: formatFileSize(document.fileSize),
      },
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
