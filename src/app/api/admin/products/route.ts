import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch all products for admin
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const storeId = searchParams.get('storeId')
    const submitted = searchParams.get('submitted')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (storeId) {
      where.storeId = storeId
    }

    if (submitted === 'true') {
      where.submittedForReview = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          Store: {
            select: {
              id: true,
              name: true,
              slug: true,
              isVerified: true,
              User: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
          Category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              Review: true,
              OrderItem: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Get stats
    const stats = await prisma.product.groupBy({
      by: ['status'],
      _count: true,
    })

    const statusCounts = {
      ACTIVE: 0,
      DRAFT: 0,
      INACTIVE: 0,
      OUT_OF_STOCK: 0,
    }

    stats.forEach((s) => {
      statusCounts[s.status as keyof typeof statusCounts] = s._count
    })

    const pendingReview = await prisma.product.count({
      where: { submittedForReview: true, status: 'DRAFT' },
    })

    return NextResponse.json({
      products,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      stats: {
        ...statusCounts,
        pendingReview,
      },
    })
  } catch (error) {
    console.error('Error fetching admin products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// PUT - Update product (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { productId, action, rejectionReason } = body

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { Store: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    let updateData: any = {}

    if (action === 'approve') {
      updateData = {
        status: 'ACTIVE',
        submittedForReview: false,
        reviewedAt: new Date(),
        reviewedBy: user.id,
        rejectionReason: null,
      }
    } else if (action === 'reject') {
      updateData = {
        status: 'DRAFT',
        submittedForReview: false,
        reviewedAt: new Date(),
        reviewedBy: user.id,
        rejectionReason,
      }
    } else if (action === 'deactivate') {
      updateData = {
        status: 'INACTIVE',
      }
    } else if (action === 'activate') {
      updateData = {
        status: 'ACTIVE',
      }
    } else if (action === 'feature') {
      updateData = {
        isFeatured: true,
      }
    } else if (action === 'unfeature') {
      updateData = {
        isFeatured: false,
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE - Delete product (admin can delete any product)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    await prisma.product.delete({
      where: { id: productId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
