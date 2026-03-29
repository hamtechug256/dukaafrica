import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ProductDetailClient } from './product-detail-client'

// Get product by slug
async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      Store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          isVerified: true,
          rating: true,
          reviewCount: true,
          city: true,
          country: true,
          totalSales: true,
        },
      },
      Category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      ProductVariant: true,
      Review: {
        include: {
          User: {
            select: {
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!product) return null

  // Transform to match component expected structure (lowercase store/category)
  return {
    ...product,
    store: product.Store,
    category: product.Category,
    variants: product.ProductVariant,
    reviews: product.Review.map(review => ({
      ...review,
      user: review.User,
    })),
  }
}

// Get related products
async function getRelatedProducts(productId: string, categoryId: string | null) {
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: productId },
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      Store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
        },
      },
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })

  // Transform to match expected structure
  return products.map(p => ({
    ...p,
    store: p.Store,
  }))
}

// Check if product has active flash sale
function checkFlashSale(product: any) {
  if (!product.isFlashSale) return null
  
  const now = new Date()
  const startDate = product.flashSaleStart ? new Date(product.flashSaleStart) : null
  const endDate = product.flashSaleEnd ? new Date(product.flashSaleEnd) : null
  
  // Check if flash sale is currently active
  const isActive = startDate && endDate && now >= startDate && now <= endDate
  
  if (!isActive) return null
  
  // Calculate flash sale price
  const flashSalePrice = product.flashSaleDiscount 
    ? product.price * (1 - product.flashSaleDiscount / 100)
    : product.price
  
  return {
    isActive: true,
    discount: product.flashSaleDiscount || 0,
    flashSalePrice,
    originalPrice: product.price,
    comparePrice: product.comparePrice,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    stock: product.flashSaleStock || 0,
    claimed: product.flashSaleClaimed || 0,
    remaining: (product.flashSaleStock || 0) - (product.flashSaleClaimed || 0),
  }
}

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(product.id, product.categoryId)

  // Parse images
  const images = product.images ? JSON.parse(product.images as string) : []
  
  // Check for active flash sale
  const flashSale = checkFlashSale(product)

  return (
    <ProductDetailClient 
      product={JSON.parse(JSON.stringify(product))} 
      images={images}
      relatedProducts={JSON.parse(JSON.stringify(relatedProducts))}
      flashSale={flashSale}
    />
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return {
      title: 'Product Not Found - DuukaAfrica',
    }
  }

  return {
    title: `${product.name} - DuukaAfrica`,
    description: product.description || product.shortDesc || `Buy ${product.name} at the best price from ${product.store?.name}. Fast delivery across East Africa.`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.images ? JSON.parse(product.images as string).slice(0, 1) : [],
    },
  }
}
