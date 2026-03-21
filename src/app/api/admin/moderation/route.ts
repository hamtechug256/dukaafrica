import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// GET /api/admin/moderation - Get products pending moderation
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause based on existing ProductStatus enum
    const where: any = {}
    
    if (status === 'pending') {
      // Products awaiting review - DRAFT status that seller wants to publish
      where.status = 'DRAFT'
      where.submittedForReview = true
    } else if (status === 'approved') {
      where.status = 'ACTIVE'
    } else if (status === 'rejected') {
      where.status = 'INACTIVE'
      where.rejectionReason = { not: null }
    } else if (status === 'all') {
      // Show all products that need attention
      where.OR = [
        { status: 'DRAFT', submittedForReview: true },
        { status: 'INACTIVE', rejectionReason: { not: null } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              country: true,
              isVerified: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              orderItems: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Parse images and add computed fields
    const productsWithImages = products.map(product => ({
      ...product,
      imagesArray: product.images ? JSON.parse(product.images) : [],
      hasIssues: !product.name || !product.description || !product.price || product.quantity < 0,
      issues: [
        !product.name ? 'Missing product name' : null,
        !product.description ? 'Missing description' : null,
        !product.price ? 'Missing price' : null,
        product.quantity < 0 ? 'Invalid quantity' : null,
        !product.images ? 'No product images' : null,
      ].filter(Boolean),
    }))

    return NextResponse.json({
      products: productsWithImages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        pending: await prisma.product.count({ where: { status: 'DRAFT', submittedForReview: true } }),
        approved: await prisma.product.count({ where: { status: 'ACTIVE' } }),
        rejected: await prisma.product.count({ where: { status: 'INACTIVE', rejectionReason: { not: null } } }),
      },
    })
  } catch (error) {
    console.error('Error fetching moderation queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch moderation queue' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/moderation - Approve or reject product
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { productId, action, rejectionReason } = body

    if (!productId || !action) {
      return NextResponse.json(
        { error: 'Product ID and action required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason required when rejecting' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    let updatedProduct

    if (action === 'approve') {
      updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          status: 'ACTIVE',
          submittedForReview: false,
          rejectionReason: null,
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
      })

      // Create notification for seller
      await prisma.notification.create({
        data: {
          userId: product.store.user.id,
          type: 'ORDER_PLACED',
          title: 'Product Approved! 🎉',
          message: `Your product "${product.name}" has been approved and is now live on DuukaAfrica.`,
          data: JSON.stringify({ productId: product.id, productName: product.name }),
        },
      })
    } else {
      updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          status: 'INACTIVE',
          submittedForReview: false,
          rejectionReason,
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
      })

      // Create notification for seller
      await prisma.notification.create({
        data: {
          userId: product.store.user.id,
          type: 'ORDER_CANCELLED',
          title: 'Product Needs Revision',
          message: `Your product "${product.name}" was not approved. Reason: ${rejectionReason}`,
          data: JSON.stringify({ productId: product.id, productName: product.name, reason: rejectionReason }),
        },
      })
    }

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error moderating product:', error)
    return NextResponse.json(
      { error: 'Failed to moderate product' },
      { status: 500 }
    )
  }
}
