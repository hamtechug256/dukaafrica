import { prisma } from '@/lib/db'
import { ProductGrid } from './product-grid'
import { ProductFilters } from './product-filters'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Get products with filters
async function getProducts(searchParams: {
  q?: string
  category?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  page?: string
}) {
  const { q, category, minPrice, maxPrice, sort, page } = searchParams
  const pageNum = parseInt(page || '1')
  const limit = 24
  const skip = (pageNum - 1) * limit

  const where: any = {
    status: 'ACTIVE',
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (category) {
    where.Category = { slug: category }
  }

  if (minPrice || maxPrice) {
    where.price = {}
    if (minPrice) where.price.gte = parseFloat(minPrice)
    if (maxPrice) where.price.lte = parseFloat(maxPrice)
  }

  const orderBy: any = {}
  switch (sort) {
    case 'price-low':
      orderBy.price = 'asc'
      break
    case 'price-high':
      orderBy.price = 'desc'
      break
    case 'newest':
      orderBy.createdAt = 'desc'
      break
    case 'popular':
      orderBy.purchaseCount = 'desc'
      break
    default:
      orderBy.createdAt = 'desc'
  }

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where,
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
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  // Transform to lowercase field names for frontend and convert Decimal to number
  const products = rawProducts.map((p) => ({
    ...p,
    price: toNum(p.price),
    comparePrice: p.comparePrice ? toNum(p.comparePrice) : null,
    costPrice: p.costPrice ? toNum(p.costPrice) : null,
    flashSaleDiscount: p.flashSaleDiscount ? toNum(p.flashSaleDiscount) : null,
    store: p.Store,
    category: p.Category,
  }))

  return {
    products,
    pagination: {
      page: pageNum,
      totalPages: Math.ceil(total / limit),
      total,
      hasMore: pageNum * limit < total,
    },
  }
}

// Get categories for filter
async function getCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
    orderBy: { name: 'asc' },
  })
}

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
    page?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams
  const [{ products, pagination }, categories] = await Promise.all([
    getProducts(resolvedSearchParams),
    getCategories(),
  ])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {resolvedSearchParams.q ? `Search results for "${resolvedSearchParams.q}"` : 'All Products'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {pagination.total.toLocaleString()} products found
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <ProductFilters categories={categories} searchParams={resolvedSearchParams} />
            </aside>

            {/* Product Grid */}
            <div className="flex-1">
              {/* Sort & View Options */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Select defaultValue={resolvedSearchParams.sort || 'newest'}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Products */}
              <ProductGrid products={products} />

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={p === pagination.page ? 'default' : 'outline'}
                      size="sm"
                      asChild
                    >
                      <a href={`/products?page=${p}&${new URLSearchParams(resolvedSearchParams as any).toString()}`}>
                        {p}
                      </a>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
