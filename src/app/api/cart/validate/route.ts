import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/cart/validate
 * 
 * Validates cart items against the current product state.
 * Returns a list of valid items and items that should be removed
 * (soft-deleted, inactive, out of stock, or price changed).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items }: { items: Array<{ productId: string; variantId?: string; price: number; quantity: number }> } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ valid: [], invalid: [] })
    }

    // Fetch all product IDs from cart
    const productIds = [...new Set(items.map(i => i.productId))]

    // Query current product state (soft-deleted filtered by Prisma middleware)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        quantity: true,
        hasVariants: true,
        deletedAt: true,
        ProductVariant: {
          select: { id: true, quantity: true, isActive: true, price: true },
        },
      },
    })

    const productMap = new Map(products.map(p => [p.id, p]))

    const valid: typeof items = []
    const invalid: Array<{
      productId: string
      variantId?: string
      reason: string
      productName?: string
    }> = []

    for (const item of items) {
      const product = productMap.get(item.productId)

      if (!product) {
        // Product was soft-deleted (filtered out by middleware) or hard deleted
        invalid.push({
          productId: item.productId,
          variantId: item.variantId,
          reason: 'PRODUCT_REMOVED',
          productName: 'Removed product',
        })
        continue
      }

      // Check if product is active
      if (product.status !== 'ACTIVE') {
        invalid.push({
          productId: item.productId,
          variantId: item.variantId,
          reason: product.status === 'INACTIVE' ? 'PRODUCT_INACTIVE' : 'PRODUCT_UNAVAILABLE',
          productName: product.name,
        })
        continue
      }

      // Check variant if applicable
      if (item.variantId && product.hasVariants) {
        const variant = product.ProductVariant.find(v => v.id === item.variantId)
        if (!variant || !variant.isActive) {
          invalid.push({
            productId: item.productId,
            variantId: item.variantId,
            reason: 'VARIANT_UNAVAILABLE',
            productName: product.name,
          })
          continue
        }

        // Check variant stock
        if (variant.quantity < item.quantity) {
          if (variant.quantity === 0) {
            invalid.push({
              productId: item.productId,
              variantId: item.variantId,
              reason: 'VARIANT_OUT_OF_STOCK',
              productName: product.name,
            })
            continue
          }
          // Adjust quantity to available stock
          valid.push({ ...item, quantity: variant.quantity })
          continue
        }
      } else {
        // Check product stock (non-variant)
        if (product.quantity < item.quantity) {
          if (product.quantity === 0) {
            invalid.push({
              productId: item.productId,
              variantId: item.variantId,
              reason: 'OUT_OF_STOCK',
              productName: product.name,
            })
            continue
          }
          valid.push({ ...item, quantity: product.quantity })
          continue
        }
      }

      // Check if price has changed significantly (>5% difference)
      const currentPrice = Number(product.price)
      const priceDiff = Math.abs(currentPrice - item.price) / item.price
      if (priceDiff > 0.05) {
        invalid.push({
          productId: item.productId,
          variantId: item.variantId,
          reason: 'PRICE_CHANGED',
          productName: product.name,
        })
        continue
      }

      // Item is valid
      valid.push(item)
    }

    return NextResponse.json({
      valid,
      invalid,
      hasInvalidItems: invalid.length > 0,
    })
  } catch (error) {
    console.error('Cart validation error:', error)
    return NextResponse.json({ error: 'Failed to validate cart' }, { status: 500 })
  }
}
