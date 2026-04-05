/**
 * Admin Document Management API
 *
 * Full CRUD for admin users to manage platform documents/resources.
 * All endpoints require ADMIN or SUPER_ADMIN role.
 *
 * GET    /api/admin/documents       — List all documents (with filters, pagination)
 * POST   /api/admin/documents       — Create a new document
 * PUT    /api/admin/documents       — Update a document
 * DELETE /api/admin/documents?id=xx  — Delete a document (also from Cloudinary)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { deleteFromCloudinary } from '@/lib/cloudinary'

// Helper: verify admin role
async function verifyAdmin() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true },
  })

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
  return user
}

// Helper: generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)
}

// GET — List all documents
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const category = searchParams.get('category')
    const isPublished = searchParams.get('isPublished')
    const targetAudience = searchParams.get('targetAudience')
    const search = searchParams.get('search')

    const where: any = {}

    if (category) where.category = category
    if (targetAudience) where.targetAudience = targetAudience
    if (isPublished !== null && isPublished !== undefined && isPublished !== '') {
      where.isPublished = isPublished === 'true'
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          Creator: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.document.count({ where }),
    ])

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// POST — Create a new document
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      category = 'GENERAL',
      fileUrl,
      fileType = 'PDF',
      fileSize = 0,
      thumbnailUrl,
      targetAudience = 'ALL',
      isPublished = false,
      isFeatured = false,
      sortOrder = 0,
      fileKey,
    } = body

    if (!title || !fileUrl) {
      return NextResponse.json(
        { error: 'Title and fileUrl are required' },
        { status: 400 }
      )
    }

    const slug = generateSlug(title)

    const document = await prisma.document.create({
      data: {
        title,
        description,
        slug,
        category,
        fileType,
        fileSize,
        fileUrl,
        fileKey,
        thumbnailUrl,
        targetAudience,
        isPublished,
        isFeatured,
        sortOrder,
        createdBy: admin.id,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}

// PUT — Update a document
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const existing = await prisma.document.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // If title changed, regenerate slug
    if (updateData.title && updateData.title !== existing.title) {
      updateData.slug = generateSlug(updateData.title)
    }

    updateData.updatedBy = admin.id

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

// DELETE — Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const document = await prisma.document.findUnique({
      where: { id },
      select: { fileKey: true },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from Cloudinary if we have the public ID
    if (document.fileKey) {
      try {
        await deleteFromCloudinary(document.fileKey)
      } catch (cloudError) {
        console.error('Failed to delete from Cloudinary (non-fatal):', cloudError)
      }
    }

    await prisma.document.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
