/**
 * Seed Script: Default Shipping Configuration
 * 
 * Populates the database with:
 * - Shipping tiers (weight brackets)
 * - Shipping rates per zone
 * - Country-to-country zone matrix
 * - Platform settings
 * 
 * Run with: npx prisma db seed
 */

import { PrismaClient, ShippingZoneType, Country, Currency } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding shipping configuration...')

  // ============================================
  // 1. CREATE SHIPPING TIERS
  // ============================================
  console.log('Creating shipping tiers...')
  
  const tiers = await Promise.all([
    prisma.shippingTier.upsert({
      where: { name: '0-1kg' },
      update: {},
      create: { name: '0-1kg', minWeight: 0, maxWeight: 1, description: 'Light items', order: 1 },
    }),
    prisma.shippingTier.upsert({
      where: { name: '1-3kg' },
      update: {},
      create: { name: '1-3kg', minWeight: 1, maxWeight: 3, description: 'Medium items', order: 2 },
    }),
    prisma.shippingTier.upsert({
      where: { name: '3-5kg' },
      update: {},
      create: { name: '3-5kg', minWeight: 3, maxWeight: 5, description: 'Regular items', order: 3 },
    }),
    prisma.shippingTier.upsert({
      where: { name: '5-10kg' },
      update: {},
      create: { name: '5-10kg', minWeight: 5, maxWeight: 10, description: 'Heavy items', order: 4 },
    }),
    prisma.shippingTier.upsert({
      where: { name: '10+kg' },
      update: {},
      create: { name: '10+kg', minWeight: 10, maxWeight: null, description: 'Bulky items', order: 5 },
    }),
  ])

  console.log(`✅ Created ${tiers.length} shipping tiers`)

  // ============================================
  // 2. CREATE SHIPPING RATES
  // ============================================
  console.log('Creating shipping rates...')

  const defaultRates = [
    { zoneType: 'LOCAL' as ShippingZoneType, baseFee: 5000, perKgFee: 500, crossBorderFee: 0 },
    { zoneType: 'DOMESTIC' as ShippingZoneType, baseFee: 8000, perKgFee: 800, crossBorderFee: 0 },
    { zoneType: 'REGIONAL' as ShippingZoneType, baseFee: 15000, perKgFee: 1500, crossBorderFee: 3000 },
    { zoneType: 'CROSS_BORDER' as ShippingZoneType, baseFee: 25000, perKgFee: 2500, crossBorderFee: 5000 },
  ]

  const firstTier = tiers[0]

  for (const rate of defaultRates) {
    await prisma.shippingRate.upsert({
      where: {
        tierId_zoneType: {
          tierId: firstTier.id,
          zoneType: rate.zoneType,
        },
      },
      update: {
        baseFee: rate.baseFee,
        perKgFee: rate.perKgFee,
        crossBorderFee: rate.crossBorderFee,
        platformMarkupPercent: 5,
      },
      create: {
        tierId: firstTier.id,
        zoneType: rate.zoneType,
        baseFee: rate.baseFee,
        perKgFee: rate.perKgFee,
        crossBorderFee: rate.crossBorderFee,
        currency: Currency.UGX,
        platformMarkupPercent: 5,
      },
    })
  }

  console.log(`✅ Created shipping rates for ${defaultRates.length} zones`)

  // ============================================
  // 3. CREATE ZONE MATRIX
  // ============================================
  console.log('Creating zone matrix...')

  // Zone matrix based on East African geography
  const zoneMatrix: Array<{
    origin: Country
    dest: Country
    zoneType: ShippingZoneType
  }> = [
    // From Uganda
    { origin: 'UGANDA', dest: 'UGANDA', zoneType: 'LOCAL' },
    { origin: 'UGANDA', dest: 'KENYA', zoneType: 'REGIONAL' },
    { origin: 'UGANDA', dest: 'TANZANIA', zoneType: 'CROSS_BORDER' },
    { origin: 'UGANDA', dest: 'RWANDA', zoneType: 'REGIONAL' },
    
    // From Kenya
    { origin: 'KENYA', dest: 'KENYA', zoneType: 'LOCAL' },
    { origin: 'KENYA', dest: 'UGANDA', zoneType: 'REGIONAL' },
    { origin: 'KENYA', dest: 'TANZANIA', zoneType: 'REGIONAL' },
    { origin: 'KENYA', dest: 'RWANDA', zoneType: 'CROSS_BORDER' },
    
    // From Tanzania
    { origin: 'TANZANIA', dest: 'TANZANIA', zoneType: 'LOCAL' },
    { origin: 'TANZANIA', dest: 'UGANDA', zoneType: 'CROSS_BORDER' },
    { origin: 'TANZANIA', dest: 'KENYA', zoneType: 'REGIONAL' },
    { origin: 'TANZANIA', dest: 'RWANDA', zoneType: 'CROSS_BORDER' },
    
    // From Rwanda
    { origin: 'RWANDA', dest: 'RWANDA', zoneType: 'LOCAL' },
    { origin: 'RWANDA', dest: 'UGANDA', zoneType: 'REGIONAL' },
    { origin: 'RWANDA', dest: 'KENYA', zoneType: 'CROSS_BORDER' },
    { origin: 'RWANDA', dest: 'TANZANIA', zoneType: 'CROSS_BORDER' },
  ]

  for (const entry of zoneMatrix) {
    await prisma.shippingZoneMatrix.upsert({
      where: {
        originCountry_destCountry: {
          originCountry: entry.origin,
          destCountry: entry.dest,
        },
      },
      update: { zoneType: entry.zoneType },
      create: {
        originCountry: entry.origin,
        destCountry: entry.dest,
        zoneType: entry.zoneType,
      },
    })
  }

  console.log(`✅ Created ${zoneMatrix.length} zone matrix entries`)

  // ============================================
  // 4. CREATE PLATFORM SETTINGS
  // ============================================
  console.log('Creating platform settings...')

  const exchangeRates = JSON.stringify({
    UGX_TO_KES: 0.035,
    UGX_TO_TZS: 0.27,
    UGX_TO_RWF: 0.26,
    KES_TO_UGX: 28.5,
    KES_TO_TZS: 7.7,
    KES_TO_RWF: 7.5,
    TZS_TO_UGX: 3.7,
    TZS_TO_KES: 0.13,
    TZS_TO_RWF: 0.97,
    RWF_TO_UGX: 3.85,
    RWF_TO_KES: 0.13,
    RWF_TO_TZS: 1.03,
  })

  await prisma.platformSettings.upsert({
    where: { id: 'platform-settings' },
    update: {
      defaultCommissionRate: 10,
      shippingMarkupPercent: 5,
      exchangeRates,
      exchangeRatesUpdatedAt: new Date(),
    },
    create: {
      id: 'platform-settings',
      defaultCommissionRate: 10,
      shippingMarkupPercent: 5,
      exchangeRates,
      exchangeRatesUpdatedAt: new Date(),
    },
  })

  console.log('✅ Created platform settings')

  // ============================================
  // 5. CREATE DEFAULT CATEGORIES
  // ============================================
  console.log('Creating default categories...')

  const categories = [
    { name: 'Electronics', slug: 'electronics', icon: '📱' },
    { name: 'Fashion', slug: 'fashion', icon: '👗' },
    { name: 'Home & Garden', slug: 'home-garden', icon: '🏠' },
    { name: 'Beauty & Health', slug: 'beauty-health', icon: '💄' },
    { name: 'Sports & Outdoors', slug: 'sports-outdoors', icon: '⚽' },
    { name: 'Automotive', slug: 'automotive', icon: '🚗' },
    { name: 'Books & Stationery', slug: 'books-stationery', icon: '📚' },
    { name: 'Toys & Games', slug: 'toys-games', icon: '🎮' },
    { name: 'Food & Groceries', slug: 'food-groceries', icon: '🛒' },
    { name: 'Agriculture', slug: 'agriculture', icon: '🌾' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        isActive: true,
        isFeatured: true,
      },
    })
  }

  console.log(`✅ Created ${categories.length} categories`)

  console.log('\n🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
