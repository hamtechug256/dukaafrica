import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

/**
 * API: Homepage Featured Products
 * 
 * Returns products that are marked as featured
 * If no featured products exist, returns empty array
 */
export async function GET() {
  try {
    // Find products that are featured and active
    const featuredProducts = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        isFeatured: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        price: true,
        comparePrice: true,
        rating: true,
        reviewCount: true,
        purchaseCount: true,
        quantity: true,
        freeShipping: true,
        localShippingOnly: true,
        shipsToCountries: true,
        weight: true,
        currency: true,
        Store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isVerified: true,
            country: true,
          }
        },
        Category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: [
        { purchaseCount: 'desc' }, // Best sellers first
        { rating: 'desc' },        // Then highest rated
        { createdAt: 'desc' },     // Then newest
      ],
      take: 8, // Show 8 on homepage
    })

    // Transform for frontend
    const products = featuredProducts.map(product => {
      // Parse images
      let imageUrl = '/images/product-placeholder.png'
      if (product.images) {
        try {
          const images = JSON.parse(product.images)
          if (Array.isArray(images) && images.length > 0) {
            imageUrl = images[0]
          }
        } catch {}
      }

      // Calculate discount
      const price = toNum(product.price)
      const comparePrice = toNum(product.comparePrice)
      const discount = comparePrice 
        ? Math.round((1 - price / comparePrice) * 100)
        : 0

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: imageUrl,
        price,
        comparePrice: comparePrice || null,
        discount,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        purchaseCount: product.purchaseCount || 0,
        quantity: product.quantity,
        freeShipping: product.freeShipping,
        currency: product.currency,
        category: product.Category ? {
          id: product.Category.id,
          name: product.Category.name,
          slug: product.Category.slug,
        } : null,
        seller: {
          id: product.Store.id,
          name: product.Store.name,
          slug: product.Store.slug,
          isVerified: product.Store.isVerified,
          country: product.Store.country,
        }
      }
    })

    // Get total count for pagination info
    const total = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        isFeatured: true,
      }
    })

    return NextResponse.json({
      success: true,
      products,
      hasFeaturedProducts: products.length > 0,
      total,
      showing: products.length,
      shouldShowSection: products.length > 0,
    })

  } catch (error) {
    console.error('Error fetching featured products:', error)
    return NextResponse.json(
      { 
        success: false, 
        products: [],
        hasFeaturedProducts: false,
        total: 0,
        shouldShowSection: false,
        error: 'Failed to fetch featured products'
      },
      { status: 200 }
    )
  }
}
