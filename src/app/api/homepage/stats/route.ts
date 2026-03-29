import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * API: Homepage Statistics
 * 
 * Returns REAL platform statistics from the database
 * Used by hero section, trust section, and other homepage components
 * 
 * Only shows counts that exist - never fake numbers
 */
export async function GET() {
  try {
    // Run all queries in parallel for performance
    const [
      totalProducts,
      activeProducts,
      totalStores,
      verifiedStores,
      totalUsers,
      totalOrders,
      deliveredOrders,
      totalReviews,
    ] = await Promise.all([
      // Total products
      prisma.product.count(),
      // Active products only
      prisma.product.count({
        where: { status: 'ACTIVE' }
      }),
      // Total stores
      prisma.store.count(),
      // Verified stores
      prisma.store.count({
        where: { 
          OR: [
            { isVerified: true },
            { verificationStatus: 'VERIFIED' }
          ]
        }
      }),
      // Total users
      prisma.user.count(),
      // Total orders
      prisma.order.count(),
      // Delivered orders
      prisma.order.count({
        where: { status: 'DELIVERED' }
      }),
      // Total reviews
      prisma.review.count(),
    ])

    // Calculate average rating
    const ratingAggregate = await prisma.review.aggregate({
      _avg: { rating: true },
      where: { isApproved: true }
    })
    const averageRating = ratingAggregate._avg.rating || 0

    // Countries we serve (static - true)
    const countriesServed = 4 // Uganda, Kenya, Tanzania, Rwanda

    // Determine if we should show each stat (only show if meaningful)
    const stats = {
      products: {
        total: totalProducts,
        active: activeProducts,
        // Only show if we have at least 10 products
        showCount: activeProducts >= 10,
        // Milestone achieved text
        milestone: getMilestoneText(activeProducts, 'products'),
      },
      sellers: {
        total: totalStores,
        verified: verifiedStores,
        // Only show if we have at least 5 sellers
        showCount: totalStores >= 5,
        milestone: getMilestoneText(totalStores, 'sellers'),
      },
      customers: {
        total: totalUsers,
        // Only show if we have at least 50 users
        showCount: totalUsers >= 50,
        milestone: getMilestoneText(totalUsers, 'customers'),
      },
      orders: {
        total: totalOrders,
        delivered: deliveredOrders,
        showCount: deliveredOrders >= 10,
      },
      reviews: {
        total: totalReviews,
        averageRating: averageRating.toFixed(1),
        showCount: totalReviews >= 10,
      },
      countries: {
        count: countriesServed,
        showCount: true, // Always show - it's accurate
      },
    }

    // Platform health indicators
    const platform = {
      hasProducts: activeProducts > 0,
      hasSellers: totalStores > 0,
      hasOrders: totalOrders > 0,
      hasReviews: totalReviews > 0,
      // Platform is "active" if there's any activity
      isActive: activeProducts > 0 || totalStores > 0 || totalOrders > 0,
      // Growth phase
      phase: getGrowthPhase(activeProducts, totalStores, totalUsers),
    }

    return NextResponse.json({
      success: true,
      stats,
      platform,
      // Timestamp for cache invalidation
      fetchedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error fetching homepage stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stats',
        // Return safe defaults
        stats: {
          products: { total: 0, active: 0, showCount: false, milestone: null },
          sellers: { total: 0, verified: 0, showCount: false, milestone: null },
          customers: { total: 0, showCount: false, milestone: null },
          orders: { total: 0, delivered: 0, showCount: false },
          reviews: { total: 0, averageRating: '0.0', showCount: false },
          countries: { count: 4, showCount: true },
        },
        platform: {
          hasProducts: false,
          hasSellers: false,
          hasOrders: false,
          hasReviews: false,
          isActive: false,
          phase: 'launch',
        }
      },
      { status: 200 } // Return 200 with defaults to not break homepage
    )
  }
}

/**
 * Get milestone achievement text
 * Returns null until threshold is reached
 */
function getMilestoneText(count: number, type: 'products' | 'sellers' | 'customers'): string | null {
  if (type === 'products') {
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K+ Products`
    if (count >= 500) return '500+ Products'
    if (count >= 100) return '100+ Products'
    if (count >= 50) return '50+ Products'
    if (count >= 10) return '10+ Products'
    return null
  }
  
  if (type === 'sellers') {
    if (count >= 500) return `${(count / 1000).toFixed(0)}K+ Sellers`
    if (count >= 100) return '100+ Sellers'
    if (count >= 50) return '50+ Sellers'
    if (count >= 10) return '10+ Sellers'
    if (count >= 5) return 'Trusted Sellers'
    return null
  }
  
  if (type === 'customers') {
    if (count >= 10000) return `${(count / 1000).toFixed(0)}K+ Customers`
    if (count >= 1000) return '1K+ Customers'
    if (count >= 500) return '500+ Customers'
    if (count >= 100) return '100+ Customers'
    if (count >= 50) return '50+ Happy Customers'
    return null
  }
  
  return null
}

/**
 * Determine platform growth phase
 */
function getGrowthPhase(products: number, sellers: number, users: number): string {
  if (products >= 1000 && sellers >= 100 && users >= 1000) {
    return 'established'
  }
  if (products >= 100 && sellers >= 20 && users >= 200) {
    return 'growing'
  }
  if (products >= 10 && sellers >= 5 && users >= 50) {
    return 'early'
  }
  return 'launch'
}
