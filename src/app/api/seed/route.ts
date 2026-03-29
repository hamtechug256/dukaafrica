import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// East Africa focused categories for DuukaAfrica marketplace
const categories = [
  // Electronics
  { name: 'Electronics', slug: 'electronics', description: 'Phones, laptops, tablets and accessories', icon: 'Smartphone', order: 1, isFeatured: true,
    children: [
      { name: 'Smartphones', slug: 'smartphones', description: 'Mobile phones and accessories' },
      { name: 'Laptops & Computers', slug: 'laptops-computers', description: 'Laptops, desktops and computer accessories' },
      { name: 'Tablets', slug: 'tablets', description: 'Tablets and e-readers' },
      { name: 'Phone Accessories', slug: 'phone-accessories', description: 'Cases, chargers, earphones and more' },
      { name: 'Audio & Headphones', slug: 'audio-headphones', description: 'Speakers, headphones and audio equipment' },
    ]
  },
  // Fashion
  { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes and accessories', icon: 'Shirt', order: 2, isFeatured: true,
    children: [
      { name: "Men's Clothing", slug: 'mens-clothing', description: 'Shirts, trousers, suits and more' },
      { name: "Women's Clothing", slug: 'womens-clothing', description: 'Dresses, skirts, blouses and more' },
      { name: 'Shoes', slug: 'shoes', description: 'Footwear for all occasions' },
      { name: 'Bags & Accessories', slug: 'bags-accessories', description: 'Handbags, backpacks, wallets and more' },
      { name: 'Jewelry & Watches', slug: 'jewelry-watches', description: 'Rings, necklaces, watches and more' },
      { name: 'Traditional Wear', slug: 'traditional-wear', description: 'African traditional clothing and accessories' },
    ]
  },
  // Home & Living
  { name: 'Home & Living', slug: 'home-living', description: 'Furniture, decor and household items', icon: 'Home', order: 3, isFeatured: true,
    children: [
      { name: 'Furniture', slug: 'furniture', description: 'Sofas, beds, tables and more' },
      { name: 'Home Decor', slug: 'home-decor', description: 'Wall art, vases, candles and more' },
      { name: 'Kitchen & Dining', slug: 'kitchen-dining', description: 'Cookware, utensils and dining sets' },
      { name: 'Bedding & Bath', slug: 'bedding-bath', description: 'Bed sheets, towels and bathroom accessories' },
      { name: 'Cleaning & Laundry', slug: 'cleaning-laundry', description: 'Cleaning supplies and laundry essentials' },
    ]
  },
  // Beauty & Personal Care
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Skincare, makeup and grooming products', icon: 'Sparkles', order: 4, isFeatured: true,
    children: [
      { name: 'Skincare', slug: 'skincare', description: 'Face creams, serums and moisturizers' },
      { name: 'Makeup', slug: 'makeup', description: 'Lipstick, foundation, mascara and more' },
      { name: 'Hair Care', slug: 'hair-care', description: 'Shampoos, conditioners and styling products' },
      { name: 'Fragrances', slug: 'fragrances', description: 'Perfumes and colognes' },
      { name: 'Personal Care', slug: 'personal-care', description: 'Toiletries and grooming essentials' },
    ]
  },
  // Groceries & Food
  { name: 'Groceries & Food', slug: 'groceries-food', description: 'Fresh food, beverages and pantry items', icon: 'ShoppingBasket', order: 5, isFeatured: true,
    children: [
      { name: 'Fresh Produce', slug: 'fresh-produce', description: 'Fruits and vegetables' },
      { name: 'Grains & Cereals', slug: 'grains-cereals', description: 'Rice, maize flour, wheat and more' },
      { name: 'Beverages', slug: 'beverages', description: 'Drinks, juices and water' },
      { name: 'Snacks & Confectionery', slug: 'snacks-confectionery', description: 'Chips, biscuits, sweets and more' },
      { name: 'Dairy & Eggs', slug: 'dairy-eggs', description: 'Milk, cheese, yogurt and eggs' },
    ]
  },
  // Health & Wellness
  { name: 'Health & Wellness', slug: 'health-wellness', description: 'Health products and fitness equipment', icon: 'Heart', order: 6, isFeatured: false,
    children: [
      { name: 'Medicines & Supplements', slug: 'medicines-supplements', description: 'Over-the-counter medicines and vitamins' },
      { name: 'Fitness Equipment', slug: 'fitness-equipment', description: 'Gym gear and exercise equipment' },
      { name: 'Medical Supplies', slug: 'medical-supplies', description: 'First aid, masks and medical devices' },
    ]
  },
  // Baby & Kids
  { name: 'Baby & Kids', slug: 'baby-kids', description: 'Baby products, toys and children items', icon: 'Baby', order: 7, isFeatured: false,
    children: [
      { name: 'Baby Care', slug: 'baby-care', description: 'Diapers, baby food and toiletries' },
      { name: 'Toys & Games', slug: 'toys-games', description: 'Educational toys, puzzles and games' },
      { name: "Kids' Clothing", slug: 'kids-clothing', description: 'Clothing for babies and children' },
      { name: 'School Supplies', slug: 'school-supplies', description: 'Books, stationery and backpacks' },
    ]
  },
  // Automotive
  { name: 'Automotive', slug: 'automotive', description: 'Car parts, accessories and tools', icon: 'Car', order: 8, isFeatured: false,
    children: [
      { name: 'Car Parts', slug: 'car-parts', description: 'Spare parts and components' },
      { name: 'Car Accessories', slug: 'car-accessories', description: 'Mats, covers and gadgets' },
      { name: 'Motorcycles', slug: 'motorcycles', description: 'Bikes, parts and accessories' },
      { name: 'Tools & Equipment', slug: 'automotive-tools', description: 'Car repair tools and equipment' },
    ]
  },
  // Agriculture
  { name: 'Agriculture', slug: 'agriculture', description: 'Farm inputs, tools and equipment', icon: 'Leaf', order: 9, isFeatured: true,
    children: [
      { name: 'Seeds & Fertilizers', slug: 'seeds-fertilizers', description: 'Agricultural inputs' },
      { name: 'Farm Equipment', slug: 'farm-equipment', description: 'Tools and machinery for farming' },
      { name: 'Poultry & Livestock', slug: 'poultry-livestock', description: 'Animal feeds and supplies' },
      { name: 'Irrigation', slug: 'irrigation', description: 'Water pumps and irrigation systems' },
    ]
  },
  // Sports & Outdoors
  { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports gear and outdoor equipment', icon: 'Dumbbell', order: 10, isFeatured: false,
    children: [
      { name: 'Sports Equipment', slug: 'sports-equipment', description: 'Balls, rackets and gear' },
      { name: 'Exercise & Fitness', slug: 'exercise-fitness', description: 'Home gym equipment' },
      { name: 'Camping & Hiking', slug: 'camping-hiking', description: 'Tents, backpacks and outdoor gear' },
      { name: 'Cycling', slug: 'cycling', description: 'Bicycles and cycling accessories' },
    ]
  },
  // Books & Stationery
  { name: 'Books & Stationery', slug: 'books-stationery', description: 'Books, office supplies and printing', icon: 'BookOpen', order: 11, isFeatured: false,
    children: [
      { name: 'Books', slug: 'books', description: 'Fiction, non-fiction and educational books' },
      { name: 'Office Supplies', slug: 'office-supplies', description: 'Pens, paper and office essentials' },
      { name: 'Art & Craft', slug: 'art-craft', description: 'Art supplies and craft materials' },
    ]
  },
  // Services
  { name: 'Services', slug: 'services', description: 'Professional and personal services', icon: 'Wrench', order: 12, isFeatured: false,
    children: [
      { name: 'Electronics Repair', slug: 'electronics-repair', description: 'Phone and computer repair' },
      { name: 'Fashion Services', slug: 'fashion-services', description: 'Tailoring and fashion design' },
      { name: 'Home Services', slug: 'home-services', description: 'Plumbing, electrical and cleaning' },
      { name: 'Events & Entertainment', slug: 'events-entertainment', description: 'Event planning and entertainment' },
    ]
  },
]

export async function GET() {
  try {
    let createdCount = 0
    let skippedCount = 0

    for (const category of categories) {
      // Check if parent category exists
      const existingParent = await prisma.category.findUnique({
        where: { slug: category.slug },
      })

      let parentId: string | undefined

      if (existingParent) {
        parentId = existingParent.id
        skippedCount++
      } else {
        // Create parent category
        const parent = await prisma.category.create({
          data: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            icon: category.icon,
            order: category.order,
            isFeatured: category.isFeatured,
            isActive: true,
          },
        })
        parentId = parent.id
        createdCount++
      }

      // Create child categories
      if (category.children && parentId) {
        for (const child of category.children) {
          const existingChild = await prisma.category.findUnique({
            where: { slug: child.slug },
          })

          if (!existingChild) {
            await prisma.category.create({
              data: {
                name: child.name,
                slug: child.slug,
                description: child.description,
                parentId: parentId,
                isActive: true,
              },
            })
            createdCount++
          } else {
            skippedCount++
          }
        }
      }
    }

    // Get total count
    const totalCategories = await prisma.category.count()

    return NextResponse.json({
      success: true,
      message: 'Categories seeded successfully',
      created: createdCount,
      skipped: skippedCount,
      total: totalCategories,
    })
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json(
      { error: 'Failed to seed categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
