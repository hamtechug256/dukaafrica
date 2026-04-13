import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// POST /api/seller/products/bulk-submit-review - Submit multiple products for review
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const store = await prisma.store.findFirst({
      where: { User: { clerkId: userId } },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()
    const { productIds } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds array is required' },
        { status: 400 }
      )
    }

    if (productIds.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 products can be submitted at once' },
        { status: 400 }
      )
    }

    // Verify all products belong to this store and are DRAFT
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: store.id,
        status: 'DRAFT',
      },
      select: { id: true, name: true, description: true, images: true },
    })

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No eligible DRAFT products found' },
        { status: 400 }
      )
    }

    // Validate each product meets review requirements
    const validIds: string[] = []
    const invalidProducts: { id: string; name: string; reason: string }[] = []

    for (const product of products) {
      const errors: string[] = []

      if (!product.description || product.description.trim() === '') {
        errors.push('Description is required')
      }

      let images: string[] = []
      if (product.images) {
        try {
          images = JSON.parse(product.images)
        } catch {
          // ignore parse errors
        }
      }

      if (!images || images.length === 0) {
        errors.push('At least one image is required')
      }

      if (errors.length === 0) {
        validIds.push(product.id)
      } else {
        invalidProducts.push({
          id: product.id,
          name: product.name,
          reason: errors.join('; '),
        })
      }
    }

    // Update valid products
    let updatedCount = 0
    if (validIds.length > 0) {
      const result = await prisma.product.updateMany({
        where: { id: { in: validIds } },
        data: { submittedForReview: true },
      })
      updatedCount = result.count
    }

    return NextResponse.json({
      message: `${updatedCount} products submitted for review`,
      submitted: updatedCount,
      skipped: invalidProducts.length,
      invalidProducts,
    })
  } catch (error) {
    console.error('Bulk submit review error:', error)
    return NextResponse.json(
      { error: 'Failed to submit products for review' },
      { status: 500 }
    )
  }
}
