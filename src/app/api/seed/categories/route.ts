import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Default categories for East African marketplace
const defaultCategories = [
  { name: 'Electronics', slug: 'electronics', icon: '📱', description: 'Phones, tablets, laptops, and accessories' },
  { name: 'Fashion', slug: 'fashion', icon: '👗', description: 'Clothing, shoes, and accessories for men, women, and children' },
  { name: 'Home & Garden', slug: 'home-garden', icon: '🏠', description: 'Furniture, decor, kitchen appliances, and garden supplies' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', icon: '💄', description: 'Skincare, makeup, hair care, and personal grooming products' },
  { name: 'Health & Wellness', slug: 'health-wellness', icon: '💊', description: 'Health supplements, medical supplies, and wellness products' },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors', icon: '⚽', description: 'Sports equipment, fitness gear, and outdoor supplies' },
  { name: 'Groceries & Food', slug: 'groceries-food', icon: '🛒', description: 'Fresh produce, packaged foods, and beverages' },
  { name: 'Baby & Kids', slug: 'baby-kids', icon: '👶', description: 'Baby products, toys, and children\'s items' },
  { name: 'Automotive', slug: 'automotive', icon: '🚗', description: 'Car parts, accessories, and vehicle supplies' },
  { name: 'Books & Stationery', slug: 'books-stationery', icon: '📚', description: 'Books, educational materials, and office supplies' },
  { name: 'Jewelry & Watches', slug: 'jewelry-watches', icon: '💎', description: 'Fine jewelry, fashion jewelry, and timepieces' },
  { name: 'Agriculture & Farming', slug: 'agriculture-farming', icon: '🌾', description: 'Farm equipment, seeds, fertilizers, and agricultural supplies' },
  { name: 'Construction & Hardware', slug: 'construction-hardware', icon: '🔧', description: 'Building materials, tools, and hardware supplies' },
  { name: 'Services', slug: 'services', icon: '🛠️', description: 'Professional services, repairs, and maintenance' },
  { name: 'Art & Crafts', slug: 'art-crafts', icon: '🎨', description: 'Handmade crafts, artworks, and creative supplies' },
]

export async function GET() {
  try {
    // Check if categories already exist
    const existingCount = await prisma.category.count()
    
    if (existingCount > 0) {
      return NextResponse.json({ 
        message: `Categories already seeded (${existingCount} categories exist)`,
        categories: await prisma.category.findMany({ orderBy: { order: 'asc' } })
      })
    }

    // Seed categories
    const categories = await prisma.category.createMany({
      data: defaultCategories.map((cat, index) => ({
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        order: index,
        isActive: true,
        isFeatured: index < 8, // First 8 are featured
        updatedAt: new Date(),
      })),
    })

    return NextResponse.json({ 
      message: `Successfully seeded ${categories.count} categories`,
      categories: await prisma.category.findMany({ orderBy: { order: 'asc' } })
    })
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json(
      { error: 'Failed to seed categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual seeding
export async function POST() {
  return GET()
}
