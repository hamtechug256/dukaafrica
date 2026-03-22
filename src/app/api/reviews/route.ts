import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  orderId: z.string().optional(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().max(100, 'Title too long').optional(),
  comment: z.string().max(2000, 'Comment too long').optional(),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional(),
})

const updateReviewSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(100).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional().nullable(),
})

// GET reviews for a product
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const storeId = searchParams.get('storeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = { isApproved: true }
    if (productId) where.productId = productId
    if (storeId) {
      where.product = { storeId }
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          User: {
            select: { name: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where })
    ])

    // Calculate rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where,
      _count: true,
    })

    const avgRating = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
    })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
      },
      stats: {
        averageRating: avgRating._avg.rating || 0,
        totalReviews: total,
        distribution: ratingDistribution.reduce((acc, r) => {
          acc[r.rating] = r._count
          return acc
        }, {} as Record<number, number>),
      }
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// POST create a new review
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validate input with Zod
    const validationResult = createReviewSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { productId, orderId, rating, title, comment, images } = validationResult.data

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        }
      }
    })

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 })
    }

    // If orderId provided, verify purchase
    let isVerifiedPurchase = false
    if (orderId) {
      const orderItem = await prisma.orderItem.findFirst({
        where: {
          orderId,
          productId,
          Order: { userId: user.id }
        }
      })
      isVerifiedPurchase = !!orderItem
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        productId,
        orderId,
        rating,
        title,
        comment,
        images: images ? JSON.stringify(images) : null,
        isVerified: isVerifiedPurchase,
      },
    })

    // Update product rating
    const productReviews = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    })

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: productReviews._avg.rating || 0,
        reviewCount: productReviews._count,
      }
    })

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}

// PUT update a review
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validate input with Zod
    const validationResult = updateReviewSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { reviewId, rating, title, comment, images } = validationResult.data

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify ownership
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    })

    if (!review || review.userId !== user.id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Only update fields that were provided
    const updateData: Record<string, unknown> = {}
    if (rating !== undefined) updateData.rating = rating
    if (title !== undefined) updateData.title = title
    if (comment !== undefined) updateData.comment = comment
    if (images !== undefined) updateData.images = images ? JSON.stringify(images) : null

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    })

    // Update product rating
    const productReviews = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
    })

    await prisma.product.update({
      where: { id: review.productId },
      data: { rating: productReviews._avg.rating || 0 }
    })

    return NextResponse.json({ review: updatedReview })
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}

// DELETE a review
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reviewId = searchParams.get('id')

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    })

    if (!review || review.userId !== user.id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    await prisma.review.delete({ where: { id: reviewId } })

    // Update product rating
    const productReviews = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
      _count: true,
    })

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        rating: productReviews._avg.rating || 0,
        reviewCount: productReviews._count,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}
