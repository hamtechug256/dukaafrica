import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { FeaturedProductsClient } from './client'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Make this page dynamic - no static generation
export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every 60 seconds

// Get all featured products
async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      isFeatured: true,
    },
    include: {
      Store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          rating: true,
        }
      },
      Category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }
    },
    orderBy: [
      { purchaseCount: 'desc' },
      { rating: 'desc' },
      { createdAt: 'desc' },
    ]
  })

  return products.map(product => {
    let images: string[] = []
    if (product.images) {
      try {
        images = JSON.parse(product.images)
      } catch {}
    }

    const price = toNum(product.price)
    const comparePrice = product.comparePrice ? toNum(product.comparePrice) : null
    const discount = comparePrice 
      ? Math.round((1 - price / comparePrice) * 100)
      : 0

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      images,
      price,
      comparePrice,
      discount,
      rating: product.rating,
      reviewCount: product.reviewCount,
      purchaseCount: product.purchaseCount,
      quantity: product.quantity,
      freeShipping: product.freeShipping,
      store: {
        id: product.Store.id,
        name: product.Store.name,
        slug: product.Store.slug,
        isVerified: product.Store.isVerified,
        rating: product.Store.rating,
      },
      category: product.Category ? {
        id: product.Category.id,
        name: product.Category.name,
        slug: product.Category.slug,
      } : null,
    }
  })
}

export const metadata: Metadata = {
  title: 'Featured Products - Top Picks | DuukaAfrica',
  description: 'Discover our curated selection of featured products from verified sellers across East Africa. Quality products at the best prices.',
  openGraph: {
    title: 'Featured Products - Top Picks | DuukaAfrica',
    description: 'Discover our curated selection of featured products from verified sellers across East Africa.',
  },
}

export default async function FeaturedProductsPage() {
  let products: any[] = []

  try {
    products = await getFeaturedProducts()
  } catch (error) {
    console.error('[Featured Products] Failed to fetch featured products:', error)
  }

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      <FeaturedProductsClient products={JSON.parse(JSON.stringify(products))} />
      <Footer />
    </div>
  )
}
