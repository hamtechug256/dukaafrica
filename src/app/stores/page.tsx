import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Store, 
  Search, 
  MapPin, 
  Star, 
  Package, 
  Clock,
  ChevronRight 
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Stores - DuukaAfrica | Shop from Trusted Sellers',
  description: 'Browse verified stores and sellers on DuukaAfrica. Find trusted merchants across East Africa selling quality products.',
}

const COUNTRIES = [
  { id: 'ALL', name: 'All Countries', flag: '🌍' },
  { id: 'UGANDA', name: 'Uganda', flag: '🇺🇬' },
  { id: 'KENYA', name: 'Kenya', flag: '🇰🇪' },
  { id: 'TANZANIA', name: 'Tanzania', flag: '🇹🇿' },
  { id: 'RWANDA', name: 'Rwanda', flag: '🇷🇼' },
]

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const country = params.country || 'ALL'
  const page = parseInt(params.page || '1')
  const limit = 12
  const skip = (page - 1) * limit

  // Build filter
  const where: any = {
    status: 'ACTIVE',
  }
  
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ]
  }
  
  if (country && country !== 'ALL') {
    where.country = country
  }

  // Fetch stores and count
  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logo: true,
        country: true,
        createdAt: true,
        _count: {
          select: {
            products: { where: { status: 'ACTIVE' } },
            reviews: true,
          }
        },
        reviews: {
          select: { rating: true },
          take: 100,
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      skip,
      take: limit,
    }),
    prisma.store.count({ where })
  ])

  const totalPages = Math.ceil(total / limit)

  // Calculate average rating for each store
  const storesWithRating = stores.map(store => {
    const avgRating = store.reviews.length > 0
      ? store.reviews.reduce((sum, r) => sum + r.rating, 0) / store.reviews.length
      : 0
    return {
      ...store,
      avgRating: avgRating.toFixed(1),
      reviewCount: store._count.reviews,
    }
  })

  const countryInfo = COUNTRIES.find(c => c.id === country) || COUNTRIES[0]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Store className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Browse Stores
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Discover verified sellers and trusted stores across East Africa. 
            Shop with confidence from merchants in Uganda, Kenya, Tanzania, and Rwanda.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <form>
                  <Input
                    type="search"
                    name="q"
                    placeholder="Search stores..."
                    defaultValue={query}
                    className="pl-10"
                  />
                </form>
              </div>
            </div>

            {/* Country Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {COUNTRIES.map((c) => (
                <Link
                  key={c.id}
                  href={`/stores?${new URLSearchParams({
                    ...(query && { q: query }),
                    ...(c.id !== 'ALL' && { country: c.id }),
                    ...(page > 1 && { page: String(page) }),
                  })}`}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    country === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="mr-1">{c.flag}</span>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            {total === 0 ? (
              'No stores found'
            ) : (
              <>
                Showing <span className="font-medium text-gray-900 dark:text-white">{stores.length}</span> of{' '}
                <span className="font-medium text-gray-900 dark:text-white">{total.toLocaleString()}</span> stores
                {country !== 'ALL' && (
                  <span className="ml-1">in {countryInfo.flag} {countryInfo.name}</span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Stores Grid */}
        {stores.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No stores found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {query 
                ? `No stores match "${query}". Try a different search term.`
                : 'No stores have been registered yet. Check back soon!'}
            </p>
            {query && (
              <Link href="/stores">
                <Button variant="outline">Clear Search</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {storesWithRating.map((store) => (
              <Link key={store.id} href={`/stores/${store.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    {/* Store Logo & Info */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {store.logo ? (
                          <img 
                            src={store.logo} 
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                          {store.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{store.country}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {store.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {store.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Package className="w-4 h-4" />
                          <span>{store._count.products}</span>
                        </div>
                        {parseFloat(store.avgRating) > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{store.avgRating}</span>
                            <span className="text-gray-400">({store.reviewCount})</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Badge for new stores */}
                    {new Date().getTime() - new Date(store.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                      <Badge className="mt-3" variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        New Store
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={`/stores?${new URLSearchParams({
                  ...(query && { q: query }),
                  ...(country !== 'ALL' && { country }),
                  page: String(page - 1),
                })}`}
              >
                <Button variant="outline">Previous</Button>
              </Link>
            )}
            <span className="flex items-center px-4 text-gray-600">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/stores?${new URLSearchParams({
                  ...(query && { q: query }),
                  ...(country !== 'ALL' && { country }),
                  page: String(page + 1),
                })}`}
              >
                <Button variant="outline">Next</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Become a Seller CTA */}
      <div className="bg-gradient-to-r from-orange-500 to-green-500 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-2">
              Start Selling on DuukaAfrica
            </h2>
            <p className="opacity-90 mb-6">
              Join thousands of sellers reaching customers across East Africa. 
              Set up your store in minutes and start selling today.
            </p>
            <Link href="/seller/register">
              <Button size="lg" variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100">
                Create Your Free Store
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
