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
 * API: Homepage Flash Sales
 * 
 * Returns products that are ACTUALLY on flash sale
 * If no flash sales exist, returns empty array
 */
export async function GET() {
  try {
    const now = new Date()

    // Find products that are on flash sale
    const flashSales = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        isFlashSale: true,
        flashSaleStart: { lte: now },
        flashSaleEnd: { gte: now },
        flashSaleStock: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        price: true,
        comparePrice: true,
        flashSaleDiscount: true,
        flashSaleStock: true,
        flashSaleClaimed: true,
        flashSaleStart: true,
        flashSaleEnd: true,
        rating: true,
        reviewCount: true,
        currency: true,
        freeShipping: true,
        localShippingOnly: true,
        shipsToCountries: true,
        weight: true,
        Store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isVerified: true,
            country: true,
          }
        }
      },
      orderBy: {
        flashSaleClaimed: 'desc', // Most popular first
      },
      take: 8,
    })

    // Transform for frontend
    const products = flashSales.map(product => {
      // Calculate actual sale price
      const price = toNum(product.price)
      const comparePrice = toNum(product.comparePrice)
      const flashSaleDiscount = toNum(product.flashSaleDiscount)
      
      const salePrice = flashSaleDiscount 
        ? price * (1 - flashSaleDiscount / 100)
        : price
      
      const originalPrice = comparePrice || price
      const discount = flashSaleDiscount || 
        (comparePrice 
          ? Math.round((1 - price / comparePrice) * 100)
          : 0)
      
      const sold = product.flashSaleClaimed || 0
      const total = product.flashSaleStock || 0
      const remaining = total - sold

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

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: imageUrl,
        originalPrice,
        salePrice: Math.round(salePrice),
        discount,
        rating: product.rating || 0,
        reviews: product.reviewCount || 0,
        sold,
        total,
        remaining,
        currency: product.currency,
        flashSaleEnd: product.flashSaleEnd?.toISOString() || null,
        seller: {
          id: product.Store.id,
          name: product.Store.name,
          slug: product.Store.slug,
          isVerified: product.Store.isVerified,
          country: product.Store.country,
        },
        freeShipping: !!product.freeShipping,
        localShippingOnly: !!product.localShippingOnly,
        shipsToCountries: product.shipsToCountries || null,
        weight: product.weight ? toNum(product.weight) : null,
      }
    })

    // Find the earliest ending flash sale for countdown
    const earliestEnd = flashSales.reduce((earliest: Date | null, product) => {
      if (!product.flashSaleEnd) return earliest
      if (!earliest) return product.flashSaleEnd
      return product.flashSaleEnd < earliest ? product.flashSaleEnd : earliest
    }, null)

    // Check if there are any active flash sales
    const hasActiveFlashSales = products.length > 0

    return NextResponse.json({
      success: true,
      products,
      hasActiveFlashSales,
      total: products.length,
      // For UI to know if it should show this section
      shouldShowSection: products.length > 0,
      // Earliest end date for countdown
      earliestEnd: earliestEnd?.toISOString() || null,
    })

  } catch (error) {
    console.error('Error fetching flash sales:', error)
    return NextResponse.json(
      { 
        success: false, 
        products: [],
        hasActiveFlashSales: false,
        total: 0,
        shouldShowSection: false,
        error: 'Failed to fetch flash sales'
      },
      { status: 200 }
    )
  }
}
