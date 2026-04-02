import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/sanitize'

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

    // Check if current user can review (has purchased this product)
    let userCanReview = false
    let userOrderId: string | null = null
    let userAlreadyReviewed = false

    try {
      const { userId } = await auth()
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { clerkId: userId },
          select: { id: true },
        })

        if (user) {
          // Check if user already reviewed this product
          if (productId) {
            const existingReview = await prisma.review.findUnique({
              where: {
                userId_productId: {
                  userId: user.id,
                  productId,
                },
              },
              select: { id: true },
            })
            userAlreadyReviewed = !!existingReview
          }

          // Check if user has a delivered order containing this product
          if (productId && !userAlreadyReviewed) {
            const orderItem = await prisma.orderItem.findFirst({
              where: {
                productId,
                Order: {
                  userId: user.id,
                  status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'SHIPPED'] },
                  paymentStatus: 'PAID',
                },
              },
              select: { orderId: true },
              orderBy: { createdAt: 'desc' },
            })
            if (orderItem) {
              userCanReview = true
              userOrderId = orderItem.orderId
            }
          }

          // Check if user is the product's seller (should not review own product)
          if (productId) {
            const product = await prisma.product.findUnique({
              where: { id: productId },
              select: { storeId: true },
            })
            if (product) {
              const sellerStore = await prisma.store.findUnique({
                where: { userId: user.id, id: product.storeId },
                select: { id: true },
              })
              if (sellerStore) {
                // Seller owns this product — cannot review
                userCanReview = false
                userOrderId = null
              }
            }
          }
        }
      }
    } catch {
      // Auth check failed — user is not logged in, which is fine
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
        // Purchase & seller check info for the current user
        userCanReview,
        userOrderId,
        userAlreadyReviewed,
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

    const rateLimit = await checkRateLimit('review_create', userId, 3, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const { productId, orderId, rating, title, comment, images } = body

    // Sanitize user-generated text to prevent stored XSS
    const sanitizedTitle = title ? sanitizeText(title) : undefined
    const sanitizedComment = comment ? sanitizeText(comment) : undefined

    // Validate required fields
    if (!productId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid review data' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // === SELLER SELF-REVIEW PREVENTION ===
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { storeId: true, name: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const sellerStore = await prisma.store.findUnique({
      where: { userId: user.id, id: product.storeId },
      select: { id: true },
    })

    if (sellerStore) {
      return NextResponse.json({
        error: 'You cannot review your own product',
      }, { status: 403 })
    }

    // === PURCHASE-VERIFIED REVIEW REQUIREMENT ===
    if (!orderId) {
      return NextResponse.json({
        error: 'Only verified purchasers can leave reviews. You must provide an order ID.',
      }, { status: 400 })
    }

    // Verify the order exists, belongs to the user, contains this product, and is paid/delivered
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        orderId,
        productId,
        Order: {
          userId: user.id,
          paymentStatus: 'PAID',
          status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'SHIPPED'] },
        },
      },
    })

    if (!orderItem) {
      return NextResponse.json({
        error: 'You can only review products from orders you have purchased and received.',
      }, { status: 403 })
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

    // Create review — always marked as verified since we verified the purchase above
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        productId,
        orderId,
        rating,
        title: sanitizedTitle,
        comment: sanitizedComment,
        images: images ? JSON.stringify(images) : null,
        isVerified: true,
      },
    })

    // Mark the order item as reviewed
    await prisma.orderItem.update({
      where: { id: orderItem.id },
      data: { isReviewed: true },
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
    const { reviewId, rating, title, comment, images } = body

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

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating,
        title,
        comment,
        images: images ? JSON.stringify(images) : null,
      },
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
