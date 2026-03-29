import { prisma } from '@/lib/db'
import { Metadata } from 'next'
import { ProductGrid } from '../product-grid'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every 60 seconds

export const metadata: Metadata = {
  title: 'Featured Products - DuukaAfrica',
  description: 'Discover our hand-picked selection of featured products from top verified sellers across East Africa.',
}

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
        },
      },
      Category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
    take: 48,
  })

  // Transform to match ProductGrid interface (lowercase 'store')
  return products.map(product => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    comparePrice: product.comparePrice,
    images: product.images,
    rating: product.rating,
    reviewCount: product.reviewCount,
    quantity: product.quantity,
    currency: product.currency,
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
  }))
}

export default async function FeaturedProductsPage() {
  const products = await getFeaturedProducts()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Featured Products
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Our hand-picked selection of top products from verified sellers
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-8">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No featured products yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Check back soon for our curated selection of top products!
            </p>
            <a
              href="/products"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Browse All Products
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
