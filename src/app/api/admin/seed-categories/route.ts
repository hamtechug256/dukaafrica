import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

// Default categories for DuukaAfrica marketplace
const DEFAULT_CATEGORIES = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Phones, laptops, gadgets and electronic devices',
    icon: 'Smartphone',
    order: 0,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Fashion & Clothing',
    slug: 'fashion-clothing',
    description: 'Clothes, shoes, accessories and fashion items',
    icon: 'Shirt',
    order: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Food & Groceries',
    slug: 'food-groceries',
    description: 'Fresh food, groceries, beverages and snacks',
    icon: 'Utensils',
    order: 2,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Furniture, home decor, garden supplies and appliances',
    icon: 'Home',
    order: 3,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Cosmetics, skincare, haircare and personal care products',
    icon: 'Sparkles',
    order: 4,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Sports equipment, gym gear and fitness accessories',
    icon: 'Dumbbell',
    order: 5,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Baby & Kids',
    slug: 'baby-kids',
    description: 'Baby products, toys, kids clothing and accessories',
    icon: 'Baby',
    order: 6,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Books & Stationery',
    slug: 'books-stationery',
    description: 'Books, educational materials and office supplies',
    icon: 'BookOpen',
    order: 7,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    description: 'Car parts, accessories and automotive services',
    icon: 'Car',
    order: 8,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Health supplements, medical supplies and wellness products',
    icon: 'HeartPulse',
    order: 9,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Agriculture & Farming',
    slug: 'agriculture-farming',
    description: 'Farm equipment, seeds, fertilizers and agricultural products',
    icon: 'Wheat',
    order: 10,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Services',
    slug: 'services',
    description: 'Professional services, repairs, and skilled work',
    icon: 'Wrench',
    order: 11,
    isActive: true,
    isFeatured: false,
  },
]

// Super admin emails from environment
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

async function ensureAdmin(userId: string) {
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || ''
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email)

  let user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        clerkId: userId,
        email: email,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null,
        avatar: clerkUser?.imageUrl,
        role: isSuperAdminEmail ? 'SUPER_ADMIN' : 'BUYER',
        updatedAt: new Date(),
      }
    })
    return user
  }

  if (isSuperAdminEmail && user.role !== 'SUPER_ADMIN') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN', updatedAt: new Date() }
    })
  }

  return user
}

// POST - Seed default categories
export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await ensureAdmin(userId)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if categories already exist
    const existingCount = await prisma.category.count()
    
    if (existingCount > 0) {
      return NextResponse.json({ 
        error: 'Categories already exist', 
        message: `Found ${existingCount} existing categories. Delete them first if you want to reseed.`,
        existingCount
      }, { status: 400 })
    }

    // Create all default categories
    const createdCategories = await prisma.category.createMany({
      data: DEFAULT_CATEGORIES,
    })

    return NextResponse.json({ 
      success: true, 
      message: `Created ${createdCategories.count} default categories`,
      categories: DEFAULT_CATEGORIES.map(c => c.name)
    })
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json(
      { error: 'Failed to seed categories' },
      { status: 500 }
    )
  }
}

// GET - Preview default categories (without creating)
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await ensureAdmin(userId)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingCount = await prisma.category.count()

    return NextResponse.json({ 
      defaultCategories: DEFAULT_CATEGORIES,
      existingCount,
      canSeed: existingCount === 0
    })
  } catch (error) {
    console.error('Error fetching seed preview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preview' },
      { status: 500 }
    )
  }
}
