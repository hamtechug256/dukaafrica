import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ProductDetailClient } from './product-detail-client'
import { generateProductMetadata, generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo'
import { JsonLd } from '@/components/json-ld'
import { Prisma } from '@prisma/client'

function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

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
  
  const isActive = startDate && endDate && now >= startDate && now <= endDate
  
  if (!isActive) return null
  
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

// Generate metadata using the SEO helper (uses metaTitle/metaDesc from DB!)
export async function generateMetadata({ params }: ProductPageProps) {
  try {
    const { slug } = await params
    const product = await getProduct(slug)

    if (!product) {
      return { title: 'Product Not Found' }
    }

    return generateProductMetadata({
      name: product.name,
      description: product.description,
      shortDesc: product.shortDesc,
      metaTitle: product.metaTitle,
      metaDesc: product.metaDesc,
      slug: product.slug,
      images: product.images as string | null,
      price: toNum(product.price),
      currency: product.currency,
      store: product.store ? { name: product.store.name } : null,
      category: product.category ? { name: product.category.name } : null,
    })
  } catch (error) {
    console.error('[Product Detail] generateMetadata failed:', error)
    return { title: 'Product | DuukaAfrica' }
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  try {
    const { slug } = await params
    const product = await getProduct(slug)

    if (!product) {
      notFound()
    }

    let relatedProducts: any[] = []
    try {
      relatedProducts = await getRelatedProducts(product.id, product.categoryId)
    } catch (error) {
      console.error('[Product Detail] getRelatedProducts failed:', error)
    }

    const images = product.images ? JSON.parse(product.images as string) : []
    const flashSale = checkFlashSale(product)

    // JSON-LD structured data
    const productSchema = generateProductSchema({
      id: product.id,
      name: product.name,
      description: product.description,
      slug: product.slug,
      images: product.images as string | null,
      price: toNum(product.price),
      comparePrice: product.comparePrice ? toNum(product.comparePrice) : null,
      currency: product.currency,
      rating: product.rating,
      reviewCount: product.reviewCount,
      quantity: product.quantity,
      category: product.category,
      store: product.store,
    })

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      ...(product.category ? [{ name: product.category.name, url: `/categories/${product.category.slug}` }] : []),
      { name: product.name, url: `/products/${product.slug}` },
    ])

    return (
      <>
        <JsonLd data={productSchema} />
        <JsonLd data={breadcrumbSchema} />
        <ProductDetailClient 
          product={JSON.parse(JSON.stringify(product))} 
          images={images}
          relatedProducts={JSON.parse(JSON.stringify(relatedProducts))}
          flashSale={flashSale}
        />
      </>
    )
  } catch (error) {
    console.error('[Product Detail] Page render failed:', error)
    notFound()
  }
}
