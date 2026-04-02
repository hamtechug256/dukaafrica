import { Metadata } from 'next'
import { prisma } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Search Products - DuukaAfrica',
  description: 'Search thousands of products from verified sellers across East Africa on DuukaAfrica. Find electronics, fashion, home goods and more.',
  keywords: 'search products, find items, online shopping, East Africa marketplace',
}

import { ProductGrid } from '../products/product-grid'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, TrendingUp, Clock } from 'lucide-react'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Search products
async function searchProducts(query: string, page: number = 1) {
  if (!query) {
    return { products: [], pagination: { page: 1, totalPages: 0, total: 0, hasMore: false } }
  }

  const limit = 24
  const skip = (page - 1) * limit

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { keywords: { contains: query, mode: 'insensitive' } },
        ],
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
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { keywords: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
  ])

  // Transform to match ProductGrid expected shape and convert Decimal to number
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
      page,
      totalPages: Math.ceil(total / limit),
      total,
      hasMore: page * limit < total,
    },
  }
}

// Get trending searches
function getTrendingSearches() {
  // In a real app, this would be based on actual search data
  return [
    { term: 'iPhone 15', count: 1250 },
    { term: 'Samsung Galaxy', count: 980 },
    { term: 'Laptops', count: 856 },
    { term: 'Men\'s Shoes', count: 742 },
    { term: 'Women\'s Fashion', count: 689 },
    { term: 'Electronics', count: 621 },
    { term: 'Home Appliances', count: 534 },
    { term: 'Smartphones', count: 489 },
  ]
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page } = await searchParams
  const query = q || ''
  const pageNum = parseInt(page || '1')

  let products: any[] = []
  let pagination = { page: 1, totalPages: 0, total: 0, hasMore: false }
  let trendingSearches = getTrendingSearches()

  try {
    const result = await searchProducts(query, pageNum)
    products = result.products
    pagination = result.pagination
  } catch (error) {
    console.error('[Search Page] searchProducts failed:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form action="/search" method="get" className="max-w-2xl mx-auto">
            <div className="relative">
              <Input
                name="q"
                type="search"
                placeholder="Search for products, brands, and more..."
                defaultValue={query}
                className="w-full h-14 pl-12 pr-4 text-lg rounded-xl"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {query ? (
          <>
            {/* Search Results */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Search results for "{query}"
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {pagination.total.toLocaleString()} products found
              </p>
            </div>

            {products.length > 0 ? (
              <>
                <ProductGrid products={products} />

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center gap-2">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const p = i + 1
                      return (
                        <a
                          key={p}
                          href={`/search?q=${encodeURIComponent(query)}&page=${p}`}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            p === pageNum
                              ? 'bg-primary text-white'
                              : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {p}
                        </a>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Try different keywords or browse our categories
                </p>
                <a href="/categories">
                  <Button>Browse Categories</Button>
                </a>
              </div>
            )}
          </>
        ) : (
          <>
            {/* No search query - show trending */}
            <div className="max-w-2xl mx-auto">
              {/* Trending Searches */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Trending Searches
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((item) => (
                    <a
                      key={item.term}
                      href={`/search?q=${encodeURIComponent(item.term)}`}
                      className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      {item.term}
                    </a>
                  ))}
                </div>
              </div>

              {/* Recent Searches placeholder */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Searches
                  </h2>
                </div>
                <p className="text-gray-500 text-sm">
                  Your recent searches will appear here
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
