'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowRight, Store, Trash2 } from 'lucide-react'
import { useRecentlyViewedStore, type RecentProduct } from '@/store/recently-viewed-store'

export function RecentlyViewedSection() {
  const { products, clearHistory, removeProduct } = useRecentlyViewedStore()
  const [mounted, setMounted] = useState(false)
  
  // Only render after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || products.length === 0) {
    return null
  }

  const displayProducts = products.slice(0, 8) // Show max 8 on homepage

  return (
    <section className="py-8 bg-gray-50">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Continue Shopping
            </h2>
            <Badge variant="secondary" className="ml-2">
              {products.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/recently-viewed">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-red-500"
              onClick={clearHistory}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
          {displayProducts.map((product) => (
            <RecentlyViewedGridCard 
              key={product.id} 
              product={product}
              onRemove={() => removeProduct(product.id)}
            />
          ))}
        </div>

        {/* View All Link - Mobile */}
        <div className="mt-4 text-center sm:hidden">
          <Link href="/recently-viewed">
            <Button variant="outline" className="w-full">
              View All Recently Viewed ({products.length})
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

interface RecentlyViewedGridCardProps {
  product: RecentProduct
  onRemove: () => void
}

function RecentlyViewedGridCard({ product, onRemove }: RecentlyViewedGridCardProps) {
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative">
      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-full"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onRemove()
        }}
      >
        <span className="sr-only">Remove</span>
        ×
      </Button>
      
      <Link href={`/products/${product.slug}`}>
        {/* Product Image */}
        <div className="relative aspect-square bg-white">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Clock className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>
        
        <CardContent className="p-3">
          {/* Store Name */}
          <div className="flex items-center gap-1 mb-1">
            <Store className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 truncate">{product.storeName}</span>
          </div>
          
          {/* Product Name */}
          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {product.currency}
            </span>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {product.price.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

// Default export for easy importing
export default RecentlyViewedSection
