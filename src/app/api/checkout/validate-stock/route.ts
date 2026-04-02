import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

// POST /api/checkout/validate-stock - Validate stock before checkout
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimit = await checkRateLimit('checkout_validate_stock', userId, 30, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { items } = body // items = [{ productId, quantity, variantId? }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const validationResults: Array<{
      productId: string;
      productName?: string;
      variantId?: string;
      valid: boolean;
      error?: string;
      available?: number;
      requested?: number;
    }> = []
    let allValid = true

    // Batch-load all products and variants to avoid N+1 queries
    const uniqueProductIds = [...new Set(items.map(i => i.productId))]
    const uniqueVariantIds = [...new Set(items.map((i: any) => i.variantId).filter(Boolean))] as string[]

    const [batchProducts, batchVariants] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: uniqueProductIds } },
        select: {
          id: true,
          name: true,
          quantity: true,
          trackQuantity: true,
          allowBackorder: true,
          status: true,
        },
      }),
      uniqueVariantIds.length > 0
        ? prisma.productVariant.findMany({
            where: { id: { in: uniqueVariantIds } },
            select: { id: true, quantity: true, isActive: true },
          })
        : (Promise.resolve([]) as Promise<{ id: string; quantity: number; isActive: boolean }[]>),
    ])

    const productMap = new Map(batchProducts.map(p => [p.id, p]))
    const variantMap = new Map(batchVariants.map(v => [v.id, v]))

    for (const item of items) {
      const product = productMap.get(item.productId) ?? null

      if (!product) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          error: 'Product not found',
        })
        allValid = false
        continue
      }

      if (product.status !== 'ACTIVE') {
        validationResults.push({
          productId: item.productId,
          productName: product.name,
          valid: false,
          error: 'Product is not available',
        })
        allValid = false
        continue
      }

      // Check variant stock if applicable
      if (item.variantId) {
        const variant = variantMap.get(item.variantId) ?? null

        if (!variant || !variant.isActive) {
          validationResults.push({
            productId: item.productId,
            variantId: item.variantId,
            productName: product.name,
            valid: false,
            error: 'Product variant is not available',
          })
          allValid = false
          continue
        }

        if (product.trackQuantity && !product.allowBackorder && variant.quantity < item.quantity) {
          validationResults.push({
            productId: item.productId,
            variantId: item.variantId,
            productName: product.name,
            valid: false,
            available: variant.quantity,
            requested: item.quantity,
            error: `Only ${variant.quantity} items available`,
          })
          allValid = false
          continue
        }
      } else {
        // Check main product stock
        if (product.trackQuantity && !product.allowBackorder && product.quantity < item.quantity) {
          validationResults.push({
            productId: item.productId,
            productName: product.name,
            valid: false,
            available: product.quantity,
            requested: item.quantity,
            error: `Only ${product.quantity} items available`,
          })
          allValid = false
          continue
        }
      }

      validationResults.push({
        productId: item.productId,
        productName: product.name,
        valid: true,
        available: item.variantId ? undefined : product.quantity,
      })
    }

    return NextResponse.json({
      valid: allValid,
      results: validationResults,
    })
  } catch (error) {
    console.error('Stock validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate stock' },
      { status: 500 }
    )
  }
}
