'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Star, Heart, ArrowRight, CheckCircle, Truck, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// Fetch real featured products
async function fetchFeaturedProducts() {
  const res = await fetch('/api/homepage/featured')
  if (!res.ok) throw new Error('Failed to fetch featured products')
  return res.json()
}

export function FeaturedProducts() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Fetch real featured products
  const { data: featuredData, isLoading } = useQuery({
    queryKey: ['homepage-featured'],
    queryFn: fetchFeaturedProducts,
    staleTime: 1000 * 60 * 5,
  })

  const products = featuredData?.products || []
  const hasProducts = featuredData?.shouldShowSection || false
  const total = featuredData?.total || 0

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 300)
    }
  }

  // If no featured products, show placeholder section
  if (!isLoading && !hasProducts) {
    return (
      <section ref={containerRef} className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.6_0.2_35/5%)] via-transparent to-[oklch(0.55_0.15_140/5%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="text-center py-12"
          >
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-3">
                Featured Products Coming Soon
              </h3>
              <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-6">
                We&apos;re curating the best products from our verified sellers. Check back soon!
              </p>
              <Link href="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 rounded-xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
                >
                  Browse All Products
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section ref={containerRef} className="py-16 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.6_0.2_35/5%)] via-transparent to-[oklch(0.55_0.15_140/5%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-10"
        >
          <div className="flex items-center gap-4 mb-4 lg:mb-0">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
            >
              <Star className="w-7 h-7 text-white fill-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
                Featured Products
              </h2>
              <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                Top picks from verified sellers
              </p>
            </div>
          </div>

          {/* View All CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            <Link href="/products/featured">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
              >
                View All Featured
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Navigation Arrows */}
        <div className="hidden lg:flex items-center gap-2 mb-6 justify-end">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              canScrollLeft
                ? 'bg-white dark:bg-[oklch(0.18_0.02_45)] shadow-lg hover:shadow-xl'
                : 'bg-gray-100 dark:bg-[oklch(0.22_0.02_45)] opacity-50 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className={`w-5 h-5 ${canScrollLeft ? 'text-[oklch(0.6 0.2 35)]' : 'text-gray-400'}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              canScrollRight
                ? 'bg-white dark:bg-[oklch(0.18_0.02_45)] shadow-lg hover:shadow-xl'
                : 'bg-gray-100 dark:bg-[oklch(0.22_0.02_45)] opacity-50 cursor-not-allowed'
            }`}
          >
            <ChevronRight className={`w-5 h-5 ${canScrollRight ? 'text-[oklch(0.6 0.2 35)]' : 'text-gray-400'}`} />
          </motion.button>
        </div>

        {/* Products Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto pb-4 custom-scrollbar scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {products.map((product: any, index: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-[280px] md:w-[300px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <Link href={`/products/${product.slug}`}>
                <motion.div
                  whileHover={{ y: -8 }}
                  className="group bg-white dark:bg-[oklch(0.18_0.02_45)] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.25_0.02_45)]"
                >
                  {/* Product Image */}
                  <div className="relative h-[200px] md:h-[220px] overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    
                    {/* Featured Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-lg text-sm font-bold text-white flex items-center gap-1" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}>
                      <Star className="w-3.5 h-3.5 fill-white" />
                      Featured
                    </div>
                    
                    {/* Discount Badge */}
                    {product.discount > 0 && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold text-white bg-red-500">
                        -{product.discount}%
                      </div>
                    )}

                    {/* Free Shipping */}
                    {product.freeShipping && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg text-xs font-medium text-white bg-green-500 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Free
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    {/* Seller */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                        {product.seller?.name || 'Verified Seller'}
                      </span>
                      {product.seller?.isVerified && (
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>

                    <h3 className="font-semibold text-[oklch(0.15_0.02_45)] dark:text-white mb-2 line-clamp-2 group-hover:text-[oklch(0.6_0.2_35)] dark:group-hover:text-[oklch(0.75_0.14_80)] transition-colors">
                      {product.name}
                    </h3>
                    
                    {/* Rating */}
                    {product.rating > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-4 h-4 fill-[oklch(0.75_0.14_80)] text-[oklch(0.75_0.14_80)]" />
                        <span className="text-sm font-medium text-[oklch(0.15_0.02_45)] dark:text-white">{product.rating.toFixed(1)}</span>
                        <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">({product.reviewCount})</span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-[oklch(0.6 0.2 35)]">
                        UGX {product.price?.toLocaleString()}
                      </span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="text-sm text-[oklch(0.55_0.02_45)] line-through">
                          UGX {product.comparePrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-4">
            Showing {products.length} of {total} featured products
          </p>
          <Link href="/products/featured">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[oklch(0.6 0.2 35)] dark:text-[oklch(0.75_0.14_80)] border-2 border-[oklch(0.6 0.2 35)] dark:border-[oklch(0.75_0.14_80)] hover:bg-[oklch(0.6_0.2_35/5%)] transition-colors"
            >
              View All Featured Products
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
