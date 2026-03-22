import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ProductDetailClient } from './product-detail-client'

// Get product by slug
async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      store: {
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
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      variants: true,
      reviews: {
        include: {
          user: {
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

  return product
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
      store: {
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

  return products
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
  const images = product.images ? JSON.parse(product.images) : []

  return (
    <ProductDetailClient 
      product={JSON.parse(JSON.stringify(product))} 
      images={images}
      relatedProducts={JSON.parse(JSON.stringify(relatedProducts))}
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
    description: product.description || product.shortDesc || `Buy ${product.name} at the best price from ${product.store.name}. Fast delivery across East Africa.`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.images ? JSON.parse(product.images).slice(0, 1) : [],
    },
  }
}
