'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FlashSaleTimer } from '@/components/products/flash-sale-timer'
import { FlashSaleCard } from '@/components/products/flash-sale-card'
import { Zap, ChevronLeft, ChevronRight, ArrowRight, Loader2 } from 'lucide-react'

interface FlashSaleProduct {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number
  discount: number
  currency: string
  images: string[]
  flashSaleStart: string
  flashSaleEnd: string
  flashSaleStock: number | null
  flashSaleClaimed: number
  remainingStock: number
  rating: number
  reviewCount: number
  isSoldOut: boolean
  store: {
    id: string
    name: string
    slug: string
    isVerified: boolean
    country: string
  }
  category: {
    id: string
    name: string
    slug: string
  } | null
}

// Find the earliest end time for the main countdown
function getEarliestEndTime(products: FlashSaleProduct[]): Date {
  const now = new Date()
  const validEndTimes = products
    .map((p) => new Date(p.flashSaleEnd))
    .filter((d) => d > now)

  if (validEndTimes.length === 0) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default 24 hours
  }

  return new Date(Math.min(...validEndTimes.map((d) => d.getTime())))
}

export function FlashSaleSection() {
  const [products, setProducts] = useState<FlashSaleProduct[]>([])
  const [mainEndTime, setMainEndTime] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Fetch flash sale products
  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/flash-sales?limit=10')
        
        if (!res.ok) {
          throw new Error('Failed to fetch flash sales')
        }
        
        const data = await res.json()
        setProducts(data.products || [])
        
        if (data.products?.length > 0) {
          setMainEndTime(getEarliestEndTime(data.products))
        }
      } catch (err) {
        console.error('Error fetching flash sales:', err)
        setError('Failed to load flash sales')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFlashSales()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchFlashSales, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Filter out sold out products for display (or show them with sold out overlay)
  const activeProducts = products.filter((p) => !p.isSoldOut)
  const soldOutProducts = products.filter((p) => p.isSoldOut)

  // Loading state
  if (isLoading) {
    return (
      <section className="py-8 md:py-12 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500">
        <div className="container">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        </div>
      </section>
    )
  }

  // Error or no products
  if (error || products.length === 0) {
    return null // Don't show section if no flash sales
  }

  // All products to display (active first, then sold out)
  const displayProducts = [...activeProducts, ...soldOutProducts]

  return (
    <section className="py-8 md:py-12 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)`,
          }}
        />
      </div>

      <div className="container relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-white fill-yellow-300 animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Flash Sale</h2>
                <p className="text-white/80 text-sm hidden sm:block">
                  Limited time offers - Don&apos;t miss out!
                </p>
              </div>
            </div>

            {/* Main Countdown Timer */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <FlashSaleTimer
                endTime={mainEndTime}
                variant="compact"
                showIcon={false}
                size="sm"
                className="text-white"
              />
              <span className="text-white/80 text-sm hidden sm:inline">remaining</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation Buttons */}
            <Button
              variant="outline"
              size="icon"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* View All Button */}
            <Link href="/products?flashSale=true" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                className="bg-white text-orange-600 border-white hover:bg-orange-50 font-semibold"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Products Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayProducts.map((product) => (
            <div key={product.id} className="min-w-[260px] md:min-w-[280px] flex-shrink-0">
              <FlashSaleCard
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  comparePrice: product.price,
                  images: JSON.stringify(product.images),
                  currency: product.currency,
                  flashSaleStart: product.flashSaleStart,
                  flashSaleEnd: product.flashSaleEnd,
                  flashSaleDiscount: product.discount,
                  flashSaleStock: product.flashSaleStock,
                  flashSaleClaimed: product.flashSaleClaimed,
                  store: product.store,
                  rating: product.rating,
                  reviewCount: product.reviewCount,
                }}
                showStore={true}
                compact={true}
              />
            </div>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="flex justify-center mt-4 sm:hidden">
          <Link href="/products?flashSale=true">
            <Button
              variant="outline"
              className="bg-white text-orange-600 border-white hover:bg-orange-50 font-semibold"
            >
              View All Flash Sales
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* CSS for hiding scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}

export default FlashSaleSection
