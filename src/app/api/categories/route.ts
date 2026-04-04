import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Default categories for East Africa marketplace
const defaultCategories = [
  { name: 'Electronics', slug: 'electronics', description: 'Phones, laptops, tablets and accessories', icon: 'Smartphone', order: 1, isFeatured: true },
  { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes and accessories', icon: 'Shirt', order: 2, isFeatured: true },
  { name: 'Home & Living', slug: 'home-living', description: 'Furniture, decor and household items', icon: 'Home', order: 3, isFeatured: true },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Skincare, makeup and grooming products', icon: 'Sparkles', order: 4, isFeatured: true },
  { name: 'Groceries & Food', slug: 'groceries-food', description: 'Fresh food, beverages and pantry items', icon: 'ShoppingBasket', order: 5, isFeatured: true },
  { name: 'Health & Wellness', slug: 'health-wellness', description: 'Health products and fitness equipment', icon: 'Heart', order: 6, isFeatured: false },
  { name: 'Baby & Kids', slug: 'baby-kids', description: 'Baby products, toys and children items', icon: 'Baby', order: 7, isFeatured: false },
  { name: 'Automotive', slug: 'automotive', description: 'Car parts, accessories and tools', icon: 'Car', order: 8, isFeatured: false },
  { name: 'Agriculture', slug: 'agriculture', description: 'Farm inputs, tools and equipment', icon: 'Leaf', order: 9, isFeatured: true },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports gear and outdoor equipment', icon: 'Dumbbell', order: 10, isFeatured: false },
  { name: 'Books & Stationery', slug: 'books-stationery', description: 'Books, office supplies and printing', icon: 'BookOpen', order: 11, isFeatured: false },
  { name: 'Services', slug: 'services', description: 'Professional and personal services', icon: 'Wrench', order: 12, isFeatured: false },
]

async function ensureCategoriesExist() {
  try {
    const count = await prisma.category.count()

    if (count === 0) {
      // Create categories one by one to handle errors better
      let seeded = 0
      for (const cat of defaultCategories) {
        try {
          await prisma.category.create({
            data: {
              name: cat.name,
              slug: cat.slug,
              description: cat.description,
              icon: cat.icon,
              order: cat.order,
              isFeatured: cat.isFeatured,
              isActive: true,
            },
          })
          seeded++
        } catch (createError) {
          console.error(`[Categories API] Error creating category "${cat.name}":`, createError)
        }
      }

      return seeded
    }

    return count
  } catch (error) {
    console.error('[Categories API] Error in ensureCategoriesExist:', error)
    return 0
  }
}

export async function GET() {
  try {
    // Auto-seed categories if none exist
    await ensureCategoriesExist()

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        other_Category: {
          where: { isActive: true },
        },
        _count: {
          select: { Product: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[Categories API] Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
