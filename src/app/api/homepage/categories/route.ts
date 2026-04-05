import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * API: Homepage Featured Categories
 * 
 * Returns ONLY featured categories for the homepage
 * Non-featured categories are shown on the /categories page
 */
export async function GET() {
  try {
    // Get ONLY featured categories
    const featuredCategories = await prisma.category.findMany({
      where: {
        isActive: true,
        isFeatured: true, // Only featured categories on homepage
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        _count: {
          select: {
            Product: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
      take: 8, // Reasonable limit for homepage display
    })

    // Transform for frontend
    const categoriesWithCounts = featuredCategories.map(cat => {
      const productCount = cat._count.Product
      
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        icon: cat.icon,
        productCount,
        // Only show count text if we have products
        countText: productCount > 0 
          ? productCount >= 1000 
            ? `${(productCount / 1000).toFixed(1)}K+ Products`
            : productCount >= 100
            ? `${productCount}+ Products`
            : productCount >= 10
            ? `${productCount} Products`
            : `${productCount} Product${productCount !== 1 ? 's' : ''}`
          : null,
        hasProducts: productCount > 0,
      }
    })

    return NextResponse.json({
      success: true,
      categories: categoriesWithCounts,
      total: categoriesWithCounts.length,
      hasFeatured: categoriesWithCounts.length > 0,
    })

  } catch (error) {
    console.error('Error fetching featured categories:', error)
    return NextResponse.json(
      { 
        success: false, 
        categories: [],
        total: 0,
        hasFeatured: false,
        error: 'Failed to fetch featured categories'
      },
      { status: 200 }
    )
  }
}
