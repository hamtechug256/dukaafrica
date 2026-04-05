'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { 
  Flame, Clock, Star, Truck, CheckCircle, 
  ChevronRight, Package, ShoppingCart, Heart,
  Filter, SlidersHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

interface FlashSaleProduct {
  id: string
  name: string
  slug: string
  images: string[]
  price: number
  comparePrice: number | null
  flashSaleDiscount: number
  flashSalePrice: number
  flashSaleStart: string | null
  flashSaleEnd: string | null
  flashSaleStock: number
  flashSaleClaimed: number
  rating: number
  reviewCount: number
  quantity: number
  freeShipping: boolean
  store: {
    id: string
    name: string
    slug: string
    isVerified: boolean
  }
  category: {
    id: string
    name: string
    slug: string
  } | null
}

interface FlashSalesClientProps {
  products: FlashSaleProduct[]
}

// Countdown Timer Component
function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime()
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [endDate])

  return (
    <div className="flex items-center gap-2">
      {timeLeft.days > 0 && (
        <div className="flex items-center gap-1">
          <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
            {timeLeft.days}d
          </span>
        </div>
      )}
      <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
        {String(timeLeft.hours).padStart(2, '0')}
      </span>
      <span className="text-red-500 font-bold">:</span>
      <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
        {String(timeLeft.minutes).padStart(2, '0')}
      </span>
      <span className="text-red-500 font-bold">:</span>
      <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

export function FlashSalesClient({ products: initialProducts }: FlashSalesClientProps) {
  const [sortBy, setSortBy] = useState('popular')

  // Find the earliest ending flash sale for global countdown
  const earliestEnd = initialProducts.reduce((earliest: string | null, product) => {
    if (!product.flashSaleEnd) return earliest
    if (!earliest) return product.flashSaleEnd
    return new Date(product.flashSaleEnd) < new Date(earliest) ? product.flashSaleEnd : earliest
  }, null)

  // Sort products
  const sortedProducts = [...initialProducts].sort((a, b) => {
    switch (sortBy) {
      case 'ending-soon':
        if (!a.flashSaleEnd || !b.flashSaleEnd) return 0
        return new Date(a.flashSaleEnd).getTime() - new Date(b.flashSaleEnd).getTime()
      case 'discount':
        return b.flashSaleDiscount - a.flashSaleDiscount
      case 'price-low':
        return a.flashSalePrice - b.flashSalePrice
      case 'price-high':
        return b.flashSalePrice - a.flashSalePrice
      case 'popular':
      default:
        return b.flashSaleClaimed - a.flashSaleClaimed
    }
  })

  if (initialProducts.length === 0) {
    return (
      <div className="min-h-screen bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] flex items-center justify-center mx-auto mb-6">
              <Flame className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-4">
              No Active Flash Sales
            </h1>
            <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-8 max-w-md mx-auto">
              There are no flash sales running at the moment. Check back soon for amazing deals!
            </p>
            <Link href="/products">
              <Button className="bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] hover:from-[oklch(0.55_0.2_35)] hover:to-[oklch(0.5_0.15_140)]">
                Browse All Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Flame className="w-10 h-10 animate-pulse" />
                <h1 className="text-3xl md:text-4xl font-bold">Flash Sales</h1>
              </div>
              <p className="text-white/90 text-lg">
                Limited time offers - Grab them before they&apos;re gone!
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {initialProducts.length} deals available
                </span>
              </div>
            </div>

            {/* Global Countdown */}
            {earliestEnd && (
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Sales ending soon:
                </p>
                <CountdownTimer endDate={earliestEnd} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
            Showing <span className="font-semibold text-[oklch(0.15_0.02_45)] dark:text-white">{initialProducts.length}</span> flash deals
          </p>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] bg-white dark:bg-[oklch(0.15_0.02_45)] text-[oklch(0.15_0.02_45)] dark:text-white focus:outline-none focus:ring-2 focus:ring-[oklch(0.6_0.2_35)]"
            >
              <option value="popular">Most Popular</option>
              <option value="ending-soon">Ending Soon</option>
              <option value="discount">Highest Discount</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedProducts.map((product, index) => {
            const sold = product.flashSaleClaimed
            const total = product.flashSaleStock
            const remaining = total - sold
            const soldPercent = total > 0 ? Math.round((sold / total) * 100) : 0

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/products/${product.slug}`}>
                  <div className="group bg-white dark:bg-[oklch(0.15_0.02_45)] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.images[0] || '/images/product-placeholder.png'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* Discount Badge */}
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                        -{product.flashSaleDiscount}% OFF
                      </div>

                      {/* Free Shipping */}
                      {product.freeShipping && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Free
                        </div>
                      )}

                      {/* Stock Progress */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                        <div className="flex items-center justify-between text-xs text-white mb-1.5">
                          <span>{sold} sold</span>
                          <span>{remaining} left</span>
                        </div>
                        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] rounded-full"
                            style={{ width: `${soldPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      {/* Store */}
                      <div className="flex items-center gap-1.5 text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-2">
                        <span>{product.store.name}</span>
                        {product.store.isVerified && (
                          <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="font-semibold text-[oklch(0.15_0.02_45)] dark:text-white line-clamp-2 mb-2 group-hover:text-[oklch(0.6_0.2_35)] transition-colors">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      {product.rating > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-[oklch(0.15_0.02_45)] dark:text-white">
                            {product.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                            ({product.reviewCount})
                          </span>
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-bold text-[oklch(0.6_0.2_35)]">
                          UGX {product.flashSalePrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-[oklch(0.65_0.01_85)] line-through">
                          UGX {product.price.toLocaleString()}
                        </span>
                      </div>

                      {/* Timer */}
                      {product.flashSaleEnd && (
                        <div className="flex items-center gap-2 text-sm text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                          <Clock className="w-4 h-4 text-[oklch(0.6_0.2_35)]" />
                          <span>Ends in:</span>
                          <CountdownTimer endDate={product.flashSaleEnd} />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
