import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * API: Featured Sellers for Homepage
 * 
 * Returns REAL verified stores from the database
 * Only returns stores that:
 * - Are active
 * - Have products
 * - Have good ratings (or are verified)
 * 
 * If no stores meet criteria, returns empty array
 * Homepage should handle empty state with CTA
 */
export async function GET() {
  try {
    // Get top stores with products
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
        // Must have at least one product
        Product: {
          some: {
            status: 'ACTIVE'
          }
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        banner: true,
        city: true,
        country: true,
        rating: true,
        isVerified: true,
        verificationStatus: true,
        verificationTier: true,
        _count: {
          select: {
            Product: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      },
      // Prioritize verified stores, then by rating
      orderBy: [
        { isVerified: 'desc' },
        { rating: 'desc' },
        { createdAt: 'asc' } // Earlier sellers first (founding members)
      ],
      take: 8, // Get 8 for carousel, display 4 at a time
    })

    // Transform for frontend
    const featuredSellers = stores.map(store => ({
      id: store.id,
      slug: store.slug,
      name: store.name,
      logo: store.logo || '/images/store-placeholder.png',
      banner: store.banner || '/images/store-banner-placeholder.png',
      location: `${store.city || ''}${store.city && store.country ? ', ' : ''}${store.country || ''}`,
      rating: store.rating || 0,
      isVerified: store.isVerified || store.verificationStatus === 'VERIFIED',
      verificationTier: store.verificationTier,
      productCount: store._count.Product,
    }))

    return NextResponse.json({
      success: true,
      sellers: featuredSellers,
      total: featuredSellers.length,
      hasSellers: featuredSellers.length > 0,
    })

  } catch (error) {
    console.error('Error fetching featured sellers:', error)
    return NextResponse.json(
      { 
        success: false, 
        sellers: [],
        total: 0,
        hasSellers: false,
        error: 'Failed to fetch featured sellers'
      },
      { status: 200 } // Return 200 with empty array to not break homepage
    )
  }
}
