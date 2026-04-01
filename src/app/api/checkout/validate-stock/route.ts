import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// POST /api/checkout/validate-stock - Validate stock before checkout
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          quantity: true,
          trackQuantity: true,
          allowBackorder: true,
          status: true,
        },
      })

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
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { quantity: true, isActive: true },
        })

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
