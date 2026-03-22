import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ProductGrid } from '@/app/products/product-grid'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

// Get category by slug
async function getCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
  })
}

// Get products by category
async function getCategoryProducts(categoryId: string, page: number = 1) {
  const limit = 24
  const skip = (page - 1) * limit

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categoryId,
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({
      where: {
        status: 'ACTIVE',
        categoryId,
      },
    }),
  ])

  // Transform to lowercase for frontend
  const products = rawProducts.map((p) => ({
    ...p,
    store: p.Store,
    category: p.Category,
  }))

  return {
    products,
    pagination: {
      page,
      totalPages: Math.ceil(total / limit),
      total,
      hasMore: page * limit < total,
    },
  }
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const { page } = await searchParams

  const category = await getCategory(slug)

  if (!category) {
    notFound()
  }

  const { products, pagination } = await getCategoryProducts(category.id, parseInt(page || '1'))

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Category Header */}
        <div className="bg-gradient-to-r from-orange-500 to-green-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-4">
              {category.icon && <span className="text-5xl">{category.icon}</span>}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{category.name}</h1>
                {category.description && (
                  <p className="mt-2 text-white/80">{category.description}</p>
                )}
                <p className="mt-2 text-white/60">
                  {pagination.total.toLocaleString()} products
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProductGrid products={products} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <a
                    key={pageNum}
                    href={`/categories/${slug}?page=${pageNum}`}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

// Generate static params for common categories
export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    select: { slug: true },
  })
  return categories.map((cat) => ({ slug: cat.slug }))
}
