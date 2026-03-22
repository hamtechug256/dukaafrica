import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/flash-deals - Get active flash deals
export async function GET(request: NextRequest) {
  try {
    const now = new Date()

    // Get products marked as flash sale
    const flashProducts = await prisma.product.findMany({
      where: {
        isFlashSale: true,
        status: 'ACTIVE',
        OR: [
          // Products with active discount (comparePrice set)
          {
            comparePrice: { not: null },
          },
        ],
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            country: true,
            isVerified: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 20,
    })

    // Calculate discount percentage and format
    const deals = flashProducts.map((product) => {
      const discount = product.comparePrice
        ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
        : 0

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.comparePrice,
        discount,
        currency: product.currency,
        images: product.images ? JSON.parse(product.images) : [],
        store: product.store,
        category: product.category,
        quantity: product.quantity,
        // Flash deals end at midnight
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        // Calculate items sold from order items
        soldCount: 0, // Would need to query order items
      }
    })

    // Sort by discount percentage
    deals.sort((a, b) => b.discount - a.discount)

    return NextResponse.json({
      deals,
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    })
  } catch (error) {
    console.error('Error fetching flash deals:', error)
    return NextResponse.json({ error: 'Failed to fetch flash deals' }, { status: 500 })
  }
}

// POST /api/flash-deals - Add product to flash sale (Seller/Admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, discountPercent, hours = 24 } = body

    if (!productId || !discountPercent) {
      return NextResponse.json({ error: 'Product ID and discount required' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Calculate new price
    const newPrice = product.price * (1 - discountPercent / 100)

    // Update product with flash sale
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isFlashSale: true,
        comparePrice: product.price, // Store original price
        price: newPrice,
      },
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error creating flash deal:', error)
    return NextResponse.json({ error: 'Failed to create flash deal' }, { status: 500 })
  }
}

// DELETE /api/flash-deals - Remove from flash sale
export async function DELETE(request: NextRequest) {
  try {
    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Restore original price
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isFlashSale: false,
        price: product.comparePrice || product.price,
        comparePrice: null,
      },
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error removing flash deal:', error)
    return NextResponse.json({ error: 'Failed to remove flash deal' }, { status: 500 })
  }
}
