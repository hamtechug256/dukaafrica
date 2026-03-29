import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { FlashSalesClient } from './client'

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

    const salePrice = product.flashSaleDiscount 
      ? product.price * (1 - product.flashSaleDiscount / 100)
      : product.price

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      images,
      price: product.price,
      comparePrice: product.comparePrice,
      flashSaleDiscount: product.flashSaleDiscount || 0,
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
  const products = await getFlashSales()

  return <FlashSalesClient products={JSON.parse(JSON.stringify(products))} />
}
