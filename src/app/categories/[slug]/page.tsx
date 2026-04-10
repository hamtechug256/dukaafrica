import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { Metadata } from 'next'
import { Suspense } from 'react'
import { CategoryFiltersClient } from './category-filters-client'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { DynamicIcon, getCategoryEmoji } from '@/components/ui/dynamic-icon'
import { safeParseImages } from '@/lib/helpers'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Currency symbols map for multi-country support
const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: 'UGX',
  KES: 'KES',
  TZS: 'TZS',
  RWF: 'RWF',
  BIF: 'BIF',
  USD: 'USD',
}

// Get category by slug (only active categories)
async function getCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug, isActive: true },
  })
}

// Build the where clause based on search params
function buildWhereClause(categoryId: string, searchParams: Record<string, string>) {
  const where: any = {
    status: 'ACTIVE',
    categoryId,
  }

  const search = searchParams.search?.trim()
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  return where
}

// Build the order by clause based on sort param
function buildOrderBy(sort: string) {
  switch (sort) {
    case 'price-low':
      return { price: 'asc' as const }
    case 'price-high':
      return { price: 'desc' as const }
    case 'popular':
      return { purchaseCount: 'desc' as const }
    case 'rating':
      return { rating: 'desc' as const }
    case 'newest':
    default:
      return { createdAt: 'desc' as const }
  }
}

// Get products by category with filters
async function getCategoryProducts(categoryId: string, searchParams: Record<string, string>) {
  const limit = 24
  const page = Math.max(1, parseInt(searchParams.page || '1'))
  const skip = (page - 1) * limit
  const sort = searchParams.sort || 'newest'

  const where = buildWhereClause(categoryId, searchParams)
  const orderBy = buildOrderBy(sort)

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

  // Transform to convert Decimal to number
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params
    const category = await getCategory(slug)
    if (!category) return { title: 'Category Not Found' }

    return {
      title: `${category.name} - DuukaAfrica | Shop ${category.name} Online`,
      description: category.description || `Browse the best ${category.name} products on DuukaAfrica. Shop from verified sellers across East Africa with secure payments.`,
      openGraph: {
        title: `${category.name} - DuukaAfrica`,
        description: category.description || `Shop ${category.name} products on DuukaAfrica.`,
        type: 'website',
      },
    }
  } catch (error) {
    console.error('[Category Page] generateMetadata failed:', error)
    return { title: 'Category - DuukaAfrica' }
  }
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    sort?: string
    search?: string
  }>
}

// Helper to generate pagination URL
function buildPageUrl(slug: string, page: number, sort: string, search: string): string {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (sort && sort !== 'newest') params.set('sort', sort)
  if (search) params.set('search', search)
  const qs = params.toString()
  return `/categories/${slug}${qs ? `?${qs}` : ''}`
}

// Generate page numbers for pagination with window sliding
function getPaginationRange(currentPage: number, totalPages: number): (number | 'dots')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'dots')[] = [1]

  if (currentPage > 3) {
    pages.push('dots')
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push('dots')
  }

  pages.push(totalPages)

  return pages
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  try {
    const { slug } = await params
    const sp = await searchParams

    const category = await getCategory(slug)

    if (!category) {
      notFound()
    }

    let products: any[] = []
    let pagination = { page: 1, totalPages: 0, total: 0, hasMore: false }

    try {
      const result = await getCategoryProducts(
        category.id,
        { page: sp.page || '1', sort: sp.sort || 'newest', search: sp.search || '' }
      )
      products = result.products
      pagination = result.pagination
    } catch (error) {
      console.error('[Category Page] getCategoryProducts failed:', error)
    }

    const sort = sp.sort || 'newest'
    const search = sp.search || ''

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      
      <main className="flex-1">
        {/* Category Header */}
        <div className="bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center gap-4">
              {category.image ? (
                <img src={category.image} alt={category.name} className="w-16 h-16 rounded-xl object-cover" />
              ) : category.icon ? (
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <DynamicIcon 
                    name={category.icon} 
                    className="w-10 h-10 text-white" 
                    size={40}
                  />
                </div>
              ) : (
                <span className="text-5xl">{getCategoryEmoji(category.slug)}</span>
              )}
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
        <div className="container mx-auto px-4 py-8">
          {/* Filter Bar - wrapped in Suspense for useSearchParams() */}
          <Suspense fallback={<div className="h-12 bg-[oklch(0.95_0.01_85)] dark:bg-[oklch(0.18_0.02_45)] rounded-lg animate-pulse mb-6" />}>
            <CategoryFiltersClient
              categorySlug={slug}
              currentSort={sp.sort || 'newest'}
              currentSearch={sp.search || ''}
              totalProducts={pagination.total}
            />
          </Suspense>

          {/* Product Grid */}
          <div id="product-grid">
            {/* Product grid is rendered via a child component to allow URL-based filtering */}
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product: any) => (
                <a key={product.id} href={`/products/${product.slug}`} className="group">
                  <div className="bg-white dark:bg-[oklch(0.15_0.02_45)] rounded-xl overflow-hidden border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] hover:shadow-lg transition-all">
                    <div className="aspect-square bg-[oklch(0.95_0.01_85)] dark:bg-[oklch(0.18_0.02_45)] relative overflow-hidden">
                      {product.images ? (
                        <img
                          src={safeParseImages(product.images)[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[oklch(0.7_0.01_85)] dark:text-[oklch(0.55_0.01_85)]">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      {product.comparePrice && product.comparePrice > product.price && (
                        <div className="absolute top-2 left-2 bg-[oklch(0.6_0.2_35)] text-white text-xs font-bold px-2 py-1 rounded-full">
                          -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-[oklch(0.15_0.02_45)] dark:text-white line-clamp-2 group-hover:text-[oklch(0.6_0.2_35)] transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        {product.store?.isVerified && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                        <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] truncate">{product.store?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
                          {CURRENCY_SYMBOLS[product.currency] || product.currency} {product.price.toLocaleString()}
                        </span>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <span className="text-xs text-[oklch(0.65_0.01_85)] line-through">
                            {CURRENCY_SYMBOLS[product.currency] || product.currency} {product.comparePrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {product.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-yellow-400 text-xs">&#9733;</span>
                          <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">{product.rating.toFixed(1)}</span>
                          <span className="text-xs text-[oklch(0.65_0.01_85)]">({product.reviewCount})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-[oklch(0.8_0.01_85)] dark:text-[oklch(0.45_0.01_85)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-[oklch(0.15_0.02_45)] dark:text-white">No products found</h3>
              <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mt-1">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Pagination - improved with window sliding */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2 flex-wrap">
              {getPaginationRange(pagination.page, pagination.totalPages).map((pageNum, idx) => {
                if (pageNum === 'dots') {
                  return (
                    <span key={`dots-${idx}`} className="px-4 py-2 text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                      ...
                    </span>
                  )
                }

                return (
                  <a
                    key={pageNum}
                    href={buildPageUrl(slug, pageNum, sort, search)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-[oklch(0.15_0.02_45)] text-[oklch(0.15_0.02_45)] dark:text-[oklch(0.85_0.01_85)] hover:bg-gray-100 dark:hover:bg-gray-700 border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]'
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
  } catch (error) {
    console.error('[Category Page] Page render failed:', error)
    notFound()
  }
}

// Force dynamic rendering - always serve fresh data from DB
export const dynamic = 'force-dynamic'
export const dynamicParams = true
