'use client'

import { useRecentlyViewedStore, RecentProduct } from '@/store/recently-viewed-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, X, ArrowRight, History } from 'lucide-react'
import { formatPrice } from '@/lib/currency'

interface RecentlyViewedProps {
  limit?: number
  showClear?: boolean
  showTitle?: boolean
}

export function RecentlyViewed({ limit = 10, showClear = true, showTitle = true }: RecentlyViewedProps) {
  const { products, removeProduct, clearHistory } = useRecentlyViewedStore()
  const recentProducts = products.slice(0, limit)

  if (recentProducts.length === 0) return null

  return (
    <div className="w-full">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Recently Viewed</h2>
            <span className="text-sm text-gray-500">({products.length})</span>
          </div>
          {showClear && products.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory} className="text-gray-500">
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {recentProducts.map((product) => (
          <RecentlyViewedCard
            key={product.id}
            product={product}
            onRemove={() => removeProduct(product.id)}
          />
        ))}
      </div>
    </div>
  )
}

function RecentlyViewedCard({
  product,
  onRemove,
}: {
  product: RecentProduct
  onRemove: () => void
}) {
  return (
    <Link href={`/products/${product.slug}`} className="flex-shrink-0">
      <Card className="w-40 group hover:shadow-lg transition-shadow relative">
        <CardContent className="p-2">
          {/* Remove button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              onRemove()
            }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Image */}
          <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100 mb-2">
            <Image
              src={product.image || '/placeholder.png'}
              alt={product.name}
              fill
              className="object-cover"
              sizes="160px"
            />
          </div>

          {/* Info */}
          <div className="space-y-1">
            <p className="text-sm font-medium line-clamp-2 leading-tight">
              {product.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{product.storeName}</p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-primary">
                {formatPrice(product.price, product.currency as any)}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.comparePrice, product.currency as any)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Full page version
export function RecentlyViewedFull() {
  const { products, removeProduct, clearHistory } = useRecentlyViewedStore()

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No recently viewed products</h2>
        <p className="text-gray-500 mb-6">Products you view will appear here</p>
        <Link href="/products">
          <Button>
            Browse Products
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recently Viewed</h1>
        <Button variant="outline" onClick={clearHistory}>
          <X className="w-4 h-4 mr-2" />
          Clear History
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => (
          <RecentlyViewedCardFull
            key={product.id}
            product={product}
            onRemove={() => removeProduct(product.id)}
          />
        ))}
      </div>
    </div>
  )
}

function RecentlyViewedCardFull({
  product,
  onRemove,
}: {
  product: RecentProduct
  onRemove: () => void
}) {
  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="group hover:shadow-lg transition-shadow relative h-full">
        <CardContent className="p-3">
          <button
            onClick={(e) => {
              e.preventDefault()
              onRemove()
            }}
            className="absolute top-2 right-2 w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
            <Image
              src={product.image || '/placeholder.png'}
              alt={product.name}
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium line-clamp-2">{product.name}</p>
            <Link
              href={`/stores/${product.storeSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-gray-500 hover:text-primary truncate block"
            >
              {product.storeName}
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">
                {formatPrice(product.price, product.currency as any)}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.comparePrice, product.currency as any)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Viewed {new Date(product.viewedAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
