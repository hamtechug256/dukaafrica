'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Star, Truck, CheckCircle, Heart,
  ShoppingBag, ArrowRight, Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

interface FeaturedProduct {
  id: string
  name: string
  slug: string
  images: string[]
  price: number
  comparePrice: number | null
  discount: number
  rating: number
  reviewCount: number
  purchaseCount: number
  quantity: number
  freeShipping: boolean
  store: {
    id: string
    name: string
    slug: string
    isVerified: boolean
    rating: number
  }
  category: {
    id: string
    name: string
    slug: string
  } | null
}

interface FeaturedProductsClientProps {
  products: FeaturedProduct[]
}

export function FeaturedProductsClient({ products: initialProducts }: FeaturedProductsClientProps) {
  const [sortBy, setSortBy] = useState('popular')

  // Sort products
  const sortedProducts = [...initialProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'rating':
        return b.rating - a.rating
      case 'newest':
        return 0 // Already sorted by createdAt in query
      case 'popular':
      default:
        return b.purchaseCount - a.purchaseCount
    }
  })

  if (initialProducts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-green-500 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              No Featured Products
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              There are no featured products at the moment. Check back soon for top picks from our sellers!
            </p>
            <Link href="/products">
              <Button className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600">
                Browse All Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-green-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Star className="w-10 h-10 fill-white" />
                <h1 className="text-3xl md:text-4xl font-bold">Featured Products</h1>
              </div>
              <p className="text-white/90 text-lg">
                Top picks from verified sellers - Quality you can trust
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {initialProducts.length} products
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Link href="/products">
                <Button variant="outline" className="bg-white/20 border-white text-white hover:bg-white hover:text-orange-500">
                  View All Products
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <p className="text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{initialProducts.length}</span> featured products
          </p>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest First</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/products/${product.slug}`}>
                <div className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.images[0] || '/images/product-placeholder.png'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Featured Badge */}
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                      <Star className="w-4 h-4 fill-white" />
                      Featured
                    </div>

                    {/* Discount Badge */}
                    {product.discount > 0 && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        -{product.discount}%
                      </div>
                    )}

                    {/* Free Shipping */}
                    {product.freeShipping && (
                      <div className="absolute bottom-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Free Shipping
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button className="absolute top-14 left-3 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Heart className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {/* Store */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span>{product.store.name}</span>
                      {product.store.isVerified && (
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-orange-500 transition-colors">
                      {product.name}
                    </h3>

                    {/* Rating & Sales */}
                    <div className="flex items-center gap-3 mb-2">
                      {product.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({product.reviewCount})
                          </span>
                        </div>
                      )}
                      {product.purchaseCount > 0 && (
                        <span className="text-xs text-gray-500">
                          {product.purchaseCount} sold
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-orange-500">
                        UGX {product.price.toLocaleString()}
                      </span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="text-sm text-gray-400 line-through">
                          UGX {product.comparePrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Category */}
                    {product.category && (
                      <div className="mt-2">
                        <Link 
                          href={`/categories/${product.category.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-gray-500 hover:text-orange-500 transition-colors"
                        >
                          {product.category.name}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
          }
        </div>

        {/* Back to Shopping CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Looking for more products?
          </p>
          <Link href="/products">
            <Button className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600">
              Browse All Products
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
