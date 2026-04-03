import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { FlashSalesClient } from './client'
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

// Get all active flash sales
async function getFlashSales() {
  const now = new Date()

  const flashSales = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      isFlashSale: true,
      flashSaleStart: { lte: now },
      flashSaleEnd: { gte: now },
      flashSaleStock: { gt: 0 }, // Only show items with stock
    },
    include: {
      Store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
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
    orderBy: {
      flashSaleClaimed: 'desc',
    }
  })

  return flashSales.map(product => {
    let images: string[] = []
    if (product.images) {
      try {
        images = JSON.parse(product.images)
      } catch {}
    }

    const price = toNum(product.price)
    const flashSaleDiscount = toNum(product.flashSaleDiscount)
    const salePrice = flashSaleDiscount 
      ? price * (1 - flashSaleDiscount / 100)
      : price

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      images,
      price,
      comparePrice: product.comparePrice ? toNum(product.comparePrice) : null,
      flashSaleDiscount: flashSaleDiscount || 0,
      flashSalePrice: salePrice,
      flashSaleStart: product.flashSaleStart?.toISOString() || null,
      flashSaleEnd: product.flashSaleEnd?.toISOString() || null,
      flashSaleStock: product.flashSaleStock || 0,
      flashSaleClaimed: product.flashSaleClaimed || 0,
      rating: product.rating,
      reviewCount: product.reviewCount,
      quantity: product.quantity,
      freeShipping: product.freeShipping,
      store: {
        id: product.Store.id,
        name: product.Store.name,
        slug: product.Store.slug,
        isVerified: product.Store.isVerified,
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
  title: 'Flash Sales - Limited Time Deals | DuukaAfrica',
  description: 'Discover amazing flash sale deals across East Africa. Limited time offers on electronics, fashion, home goods and more. Shop now before they\'re gone!',
  openGraph: {
    title: 'Flash Sales - Limited Time Deals | DuukaAfrica',
    description: 'Discover amazing flash sale deals across East Africa. Limited time offers on electronics, fashion, home goods and more.',
  },
}

export default async function FlashSalesPage() {
  let products: any[] = []

  try {
    products = await getFlashSales()
  } catch (error) {
    console.error('[Flash Sales] Failed to fetch flash sale products:', error)
  }

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      <FlashSalesClient products={JSON.parse(JSON.stringify(products))} />
      <Footer />
    </div>
  )
}
