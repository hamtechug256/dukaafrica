'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, Flame, Star, ChevronLeft, ChevronRight } from 'lucide-react'

const flashDeals = [
  {
    id: 1,
    name: 'Wireless Bluetooth Earbuds Pro',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
    originalPrice: 150000,
    salePrice: 89900,
    discount: 40,
    rating: 4.8,
    reviews: 234,
    sold: 156,
    total: 200,
    seller: 'TechHub Uganda',
  },
  {
    id: 2,
    name: 'African Print Maxi Dress',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80',
    originalPrice: 85000,
    salePrice: 49900,
    discount: 41,
    rating: 4.9,
    reviews: 189,
    sold: 178,
    total: 250,
    seller: 'Fashion House KE',
  },
  {
    id: 3,
    name: 'Smart Watch Series 5',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
    originalPrice: 280000,
    salePrice: 189000,
    discount: 32,
    rating: 4.7,
    reviews: 456,
    sold: 89,
    total: 150,
    seller: 'GadgetZone',
  },
  {
    id: 4,
    name: 'Organic Shea Butter Set',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80',
    originalPrice: 45000,
    salePrice: 29900,
    discount: 33,
    rating: 4.9,
    reviews: 678,
    sold: 312,
    total: 400,
    seller: 'Naturals Africa',
  },
  {
    id: 5,
    name: 'Premium Leather Backpack',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80',
    originalPrice: 120000,
    salePrice: 79900,
    discount: 33,
    rating: 4.6,
    reviews: 123,
    sold: 67,
    total: 100,
    seller: 'Leather Craft UG',
  },
  {
    id: 6,
    name: 'Fresh Coffee Beans 1kg',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80',
    originalPrice: 35000,
    salePrice: 24900,
    discount: 29,
    rating: 4.8,
    reviews: 892,
    sold: 450,
    total: 500,
    seller: 'Mountains Coffee',
  },
]

export function FlashSales() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })
  const [timeLeft, setTimeLeft] = useState({ hours: 5, minutes: 32, seconds: 45 })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScroll)
      checkScroll()
      return () => scrollContainer.removeEventListener('scroll', checkScroll)
    }
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-UG').format(price)
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
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
            >
              <Flame className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
                Flash Sales
              </h2>
              <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                Limited time offers - Don&apos;t miss out!
              </p>
            </div>
          </div>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4"
          >
            <div className="flex items-center gap-2 text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Ends in:</span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { value: timeLeft.hours, label: 'HRS' },
                { value: timeLeft.minutes, label: 'MIN' },
                { value: timeLeft.seconds, label: 'SEC' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <motion.div
                    key={item.label}
                    animate={item.value < 10 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                  >
                    <span className="text-xl font-bold text-white">
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-white/70">{item.label}</span>
                  </motion.div>
                  {index < 2 && <span className="text-2xl font-bold text-[oklch(0.6_0.2_35)]">:</span>}
                </div>
              ))}
            </div>
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
            <ChevronLeft className={`w-5 h-5 ${canScrollLeft ? 'text-[oklch(0.6_0.2_35)]' : 'text-gray-400'}`} />
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
            <ChevronRight className={`w-5 h-5 ${canScrollRight ? 'text-[oklch(0.6_0.2_35)]' : 'text-gray-400'}`} />
          </motion.button>
        </div>

        {/* Products Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto pb-4 custom-scrollbar scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {flashDeals.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-[280px] md:w-[300px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <Link href={`/products/${product.id}`}>
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
                    {/* Discount Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 25), oklch(0.6 0.2 35))' }}>
                      -{product.discount}%
                    </div>
                    {/* Stock Progress */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                        <div className="flex items-center justify-between text-xs text-white mb-1">
                          <span>{product.sold} sold</span>
                          <span>{product.total - product.sold} left</span>
                        </div>
                        <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(product.sold / product.total) * 100}%` }}
                            transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, oklch(0.6 0.2 35), oklch(0.75 0.14 80))' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-[oklch(0.15_0.02_45)] dark:text-white mb-2 line-clamp-2 group-hover:text-[oklch(0.6_0.2_35)] dark:group-hover:text-[oklch(0.75_0.14_80)] transition-colors">
                      {product.name}
                    </h3>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-4 h-4 fill-[oklch(0.75_0.14_80)] text-[oklch(0.75_0.14_80)]" />
                      <span className="text-sm font-medium text-[oklch(0.15_0.02_45)] dark:text-white">{product.rating}</span>
                      <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">({product.reviews})</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-[oklch(0.6_0.2_35)]">
                        UGX {formatPrice(product.salePrice)}
                      </span>
                      <span className="text-sm text-[oklch(0.55_0.02_45)] line-through">
                        UGX {formatPrice(product.originalPrice)}
                      </span>
                    </div>

                    {/* Seller */}
                    <p className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                      by {product.seller}
                    </p>
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
          <Link href="/products">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)] border-2 border-[oklch(0.6_0.2_35)] dark:border-[oklch(0.75_0.14_80)] hover:bg-[oklch(0.6_0.2_35/5%)] transition-colors"
            >
              View All Deals
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
