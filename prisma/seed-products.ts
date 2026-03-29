/**
 * Seed Script: Sample Products for DuukaAfrica
 * 
 * Creates sample users, stores and products for development/demo
 */

import { PrismaClient, ProductStatus, Currency, Country } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding sample products...')

  // ============================================
  // 1. CREATE SAMPLE USERS (Sellers)
  // ============================================
  console.log('Creating sample users...')

  const users = await Promise.all([
    prisma.user.upsert({
      where: { clerkId: 'seller_tech_world' },
      update: {},
      create: {
        id: randomUUID(),
        clerkId: 'seller_tech_world',
        email: 'techworld@example.com',
        name: 'Tech World Uganda',
        role: 'SELLER',
        country: 'UGANDA',
      },
    }),
    prisma.user.upsert({
      where: { clerkId: 'seller_fashion_hub' },
      update: {},
      create: {
        id: randomUUID(),
        clerkId: 'seller_fashion_hub',
        email: 'fashionhub@example.com',
        name: 'Fashion Hub Kenya',
        role: 'SELLER',
        country: 'KENYA',
      },
    }),
    prisma.user.upsert({
      where: { clerkId: 'seller_home_essentials' },
      update: {},
      create: {
        id: randomUUID(),
        clerkId: 'seller_home_essentials',
        email: 'homeessentials@example.com',
        name: 'Home Essentials TZ',
        role: 'SELLER',
        country: 'TANZANIA',
      },
    }),
    prisma.user.upsert({
      where: { clerkId: 'seller_beauty_glory' },
      update: {},
      create: {
        id: randomUUID(),
        clerkId: 'seller_beauty_glory',
        email: 'beautyglory@example.com',
        name: 'Beauty Glory Rwanda',
        role: 'SELLER',
        country: 'RWANDA',
      },
    }),
  ])

  console.log(`✅ Created ${users.length} users`)

  // ============================================
  // 2. CREATE SAMPLE STORES
  // ============================================
  console.log('Creating sample stores...')

  const stores = await Promise.all([
    prisma.store.upsert({
      where: { userId: users[0].id },
      update: {},
      create: {
        id: randomUUID(),
        userId: users[0].id,
        name: 'Tech World Uganda',
        slug: 'tech-world-uganda',
        description: 'Your one-stop shop for electronics and gadgets in East Africa',
        logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop',
        banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=300&fit=crop',
        country: Country.UGANDA,
        city: 'Kampala',
        address: 'Plot 12, Kampala Road',
        phone: '+256 700 123 456',
        email: 'info@techworld.ug',
        isVerified: true,
        isActive: true,
        rating: 4.8,
        reviewCount: 256,
        totalSales: 1520,
        commissionRate: 10,
      },
    }),
    prisma.store.upsert({
      where: { userId: users[1].id },
      update: {},
      create: {
        id: randomUUID(),
        userId: users[1].id,
        name: 'Fashion Hub Kenya',
        slug: 'fashion-hub-kenya',
        description: 'Trendy fashion and accessories from Nairobi',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
        banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=300&fit=crop',
        country: Country.KENYA,
        city: 'Nairobi',
        address: 'Westlands Mall, Nairobi',
        phone: '+254 722 987 654',
        email: 'hello@fashionhub.co.ke',
        isVerified: true,
        isActive: true,
        rating: 4.7,
        reviewCount: 189,
        totalSales: 2340,
        commissionRate: 10,
      },
    }),
    prisma.store.upsert({
      where: { userId: users[2].id },
      update: {},
      create: {
        id: randomUUID(),
        userId: users[2].id,
        name: 'Home Essentials Tanzania',
        slug: 'home-essentials-tz',
        description: 'Quality home appliances and furniture',
        logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop',
        banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=300&fit=crop',
        country: Country.TANZANIA,
        city: 'Dar es Salaam',
        address: 'Mlimani City, Dar es Salaam',
        phone: '+255 754 321 098',
        email: 'sales@homeessentials.co.tz',
        isVerified: true,
        isActive: true,
        rating: 4.6,
        reviewCount: 145,
        totalSales: 890,
        commissionRate: 10,
      },
    }),
    prisma.store.upsert({
      where: { userId: users[3].id },
      update: {},
      create: {
        id: randomUUID(),
        userId: users[3].id,
        name: 'Beauty Glory Rwanda',
        slug: 'beauty-glory-rwanda',
        description: 'Premium beauty and skincare products',
        logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
        banner: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=300&fit=crop',
        country: Country.RWANDA,
        city: 'Kigali',
        address: 'Kigali City Tower',
        phone: '+250 788 654 321',
        email: 'info@beautyglory.rw',
        isVerified: true,
        isActive: true,
        rating: 4.9,
        reviewCount: 312,
        totalSales: 3450,
        commissionRate: 10,
      },
    }),
  ])

  console.log(`✅ Created ${stores.length} stores`)

  // ============================================
  // 3. GET CATEGORIES
  // ============================================
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map(c => [c.slug, c.id]))
  console.log(`Found ${categories.length} categories`)

  // ============================================
  // 4. CREATE SAMPLE PRODUCTS
  // ============================================
  console.log('Creating sample products...')

  const products = [
    // Tech World Uganda - Electronics
    {
      id: randomUUID(),
      name: 'iPhone 15 Pro Max 256GB',
      slug: 'iphone-15-pro-max-256gb',
      shortDesc: 'Latest iPhone with A17 Pro chip',
      description: 'Experience the future of smartphones with iPhone 15 Pro Max. Features the powerful A17 Pro chip, 48MP camera system, and titanium design. Perfect for professionals and photography enthusiasts.',
      price: 5899000,
      comparePrice: 6500000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
        'https://images.unsplash.com/photo-1695048132688-9e0e0b1e234c?w=600',
      ]),
      quantity: 15,
      categoryId: categoryMap.get('electronics'),
      storeId: stores[0].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.UGX,
      rating: 4.9,
      reviewCount: 45,
      purchaseCount: 120,
      viewCount: 2500,
      freeShipping: true,
      weight: 0.3,
    },
    {
      id: randomUUID(),
      name: 'Samsung Galaxy S24 Ultra 512GB',
      slug: 'samsung-galaxy-s24-ultra-512gb',
      shortDesc: 'Galaxy AI is here. Search in a new way.',
      description: 'The Samsung Galaxy S24 Ultra brings AI to your fingertips. With Galaxy AI, you can search by circling, translate conversations in real-time, and edit photos like a pro. Features a 200MP camera and S Pen.',
      price: 5250000,
      comparePrice: 5800000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600',
        'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600',
      ]),
      quantity: 20,
      categoryId: categoryMap.get('electronics'),
      storeId: stores[0].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.UGX,
      rating: 4.8,
      reviewCount: 32,
      purchaseCount: 85,
      viewCount: 1800,
      freeShipping: true,
      weight: 0.35,
    },
    {
      id: randomUUID(),
      name: 'MacBook Air M3 15-inch 512GB',
      slug: 'macbook-air-m3-15-inch-512gb',
      shortDesc: 'Supercharged by M3. Built for Apple Intelligence.',
      description: 'The MacBook Air with M3 is an incredibly portable laptop — and so much more. It features a gorgeous 15.3-inch Liquid Retina display, 8-core CPU, 10-core GPU, and up to 18 hours of battery life.',
      price: 8500000,
      comparePrice: 9200000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
      ]),
      quantity: 8,
      categoryId: categoryMap.get('electronics'),
      storeId: stores[0].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.UGX,
      rating: 4.9,
      reviewCount: 28,
      purchaseCount: 45,
      viewCount: 1200,
      freeShipping: true,
      weight: 1.5,
    },
    {
      id: randomUUID(),
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5-wireless-headphones',
      shortDesc: 'Industry-leading noise cancellation',
      description: 'Experience industry-leading noise cancellation with the WH-1000XM5. Exceptional sound quality, 30-hour battery life, and crystal-clear calls. Perfect for travel and work.',
      price: 1250000,
      comparePrice: 1400000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600',
      ]),
      quantity: 25,
      categoryId: categoryMap.get('electronics'),
      storeId: stores[0].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.UGX,
      rating: 4.7,
      reviewCount: 56,
      purchaseCount: 200,
      viewCount: 3500,
      freeShipping: false,
      weight: 0.4,
    },
    {
      id: randomUUID(),
      name: 'Samsung 65" Crystal UHD Smart TV',
      slug: 'samsung-65-crystal-uhd-smart-tv',
      shortDesc: '4K Crystal Clear Display with Smart Features',
      description: 'Immerse yourself in stunning 4K picture quality with the Samsung Crystal UHD TV. Features PurColor technology, Smart Hub, and voice control. Perfect for your living room entertainment.',
      price: 3200000,
      comparePrice: 3800000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600',
      ]),
      quantity: 6,
      categoryId: categoryMap.get('electronics'),
      storeId: stores[0].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.UGX,
      rating: 4.6,
      reviewCount: 18,
      purchaseCount: 30,
      viewCount: 890,
      freeShipping: true,
      weight: 25,
    },

    // Fashion Hub Kenya
    {
      id: randomUUID(),
      name: 'Ankara African Print Dress - Elegant',
      slug: 'ankara-african-print-dress-elegant',
      shortDesc: 'Beautiful handmade African print dress',
      description: 'Stunning Ankara dress with modern elegant design. Made from premium African wax print fabric. Perfect for weddings, parties, and special occasions.',
      price: 85000,
      comparePrice: 120000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=600',
      ]),
      quantity: 50,
      categoryId: categoryMap.get('fashion'),
      storeId: stores[1].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.KES,
      rating: 4.8,
      reviewCount: 89,
      purchaseCount: 450,
      viewCount: 5600,
      freeShipping: false,
      weight: 0.5,
    },
    {
      id: randomUUID(),
      name: 'Leather Oxford Shoes - Premium Brown',
      slug: 'leather-oxford-shoes-premium-brown',
      shortDesc: 'Handcrafted genuine leather shoes',
      description: 'Premium handcrafted leather Oxford shoes for men. Made from genuine Kenyan leather with rubber sole for comfort. Perfect for business and formal occasions.',
      price: 12500,
      comparePrice: 18000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600',
      ]),
      quantity: 30,
      categoryId: categoryMap.get('fashion'),
      storeId: stores[1].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.KES,
      rating: 4.7,
      reviewCount: 45,
      purchaseCount: 180,
      viewCount: 2100,
      freeShipping: false,
      weight: 1.2,
    },

    // Home Essentials Tanzania
    {
      id: randomUUID(),
      name: 'Ninja Air Fryer 5.5L Digital',
      slug: 'ninja-air-fryer-5-5l-digital',
      shortDesc: 'Healthy frying with 75% less fat',
      description: 'Cook healthier meals with the Ninja Air Fryer. 5.5L capacity, digital controls, and multiple cooking functions. Fry, roast, bake, and reheat with up to 75% less fat.',
      price: 450000,
      comparePrice: 520000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600',
      ]),
      quantity: 18,
      categoryId: categoryMap.get('home-garden'),
      storeId: stores[2].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.TZS,
      rating: 4.8,
      reviewCount: 34,
      purchaseCount: 120,
      viewCount: 1800,
      freeShipping: false,
      weight: 5,
    },
    {
      id: randomUUID(),
      name: 'Samsung Double Door Refrigerator 350L',
      slug: 'samsung-double-door-refrigerator-350l',
      shortDesc: 'Energy efficient large capacity fridge',
      description: 'Samsung double door refrigerator with 350L capacity. Features digital inverter technology, toughened glass shelves, and energy-efficient design.',
      price: 1850000,
      comparePrice: 2100000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600',
      ]),
      quantity: 5,
      categoryId: categoryMap.get('home-garden'),
      storeId: stores[2].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.TZS,
      rating: 4.6,
      reviewCount: 12,
      purchaseCount: 25,
      viewCount: 650,
      freeShipping: true,
      weight: 55,
    },

    // Beauty Glory Rwanda
    {
      id: randomUUID(),
      name: 'African Black Soap - Natural Set',
      slug: 'african-black-soap-natural-set',
      shortDesc: 'Traditional African black soap gift set',
      description: 'Premium African black soap gift set made from natural ingredients. Includes black soap, shea butter, and coconut oil. Perfect for all skin types.',
      price: 25000,
      comparePrice: 35000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600',
      ]),
      quantity: 80,
      categoryId: categoryMap.get('beauty-health'),
      storeId: stores[3].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.RWF,
      rating: 4.9,
      reviewCount: 156,
      purchaseCount: 1200,
      viewCount: 8900,
      freeShipping: false,
      weight: 0.5,
    },
    {
      id: randomUUID(),
      name: 'Moroccan Argan Oil Hair Treatment',
      slug: 'moroccan-argan-oil-hair-treatment',
      shortDesc: '100% pure argan oil for hair & skin',
      description: 'Premium 100% pure Moroccan argan oil for hair and skin treatment. Rich in vitamin E and fatty acids. Repairs damaged hair, adds shine, and moisturizes skin.',
      price: 18000,
      comparePrice: 25000,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600',
      ]),
      quantity: 60,
      categoryId: categoryMap.get('beauty-health'),
      storeId: stores[3].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.RWF,
      rating: 4.7,
      reviewCount: 89,
      purchaseCount: 560,
      viewCount: 3400,
      freeShipping: false,
      weight: 0.2,
    },

    // Sports & Outdoors
    {
      id: randomUUID(),
      name: 'Adidas Football - Official Match Ball',
      slug: 'adidas-football-official-match',
      shortDesc: 'FIFA approved match ball',
      description: 'Official FIFA approved match ball by Adidas. Thermal bonded panels for consistent performance. Perfect for professional and amateur matches.',
      price: 180000,
      comparePrice: null,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=600',
      ]),
      quantity: 25,
      categoryId: categoryMap.get('sports-outdoors'),
      storeId: stores[0].id,
      status: ProductStatus.ACTIVE,
      currency: Currency.UGX,
      rating: 4.8,
      reviewCount: 23,
      purchaseCount: 85,
      viewCount: 1200,
      freeShipping: false,
      weight: 0.5,
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    })
  }

  console.log(`✅ Created ${products.length} products`)
  console.log('\n🎉 Product seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
