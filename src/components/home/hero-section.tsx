'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Play, Sparkles, ShoppingBag, Truck, Shield, Star, Users, Store } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

// Fetch real homepage stats
async function fetchHomepageStats() {
  const res = await fetch('/api/homepage/stats')
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, 200])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Fetch real stats
  const { data: statsData } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: fetchHomepageStats,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const stats = statsData?.stats
  const platform = statsData?.platform

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const slides = [
    {
      title: 'Shop Quality Products',
      highlight: 'From Trusted Sellers',
      description: 'Discover electronics, fashion, home essentials & more. Quality guaranteed with buyer protection.',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
    },
    {
      title: 'Fast Delivery',
      highlight: 'Across East Africa',
      description: 'Reliable shipping to Uganda, Kenya, Tanzania, and Rwanda. Track your orders in real-time.',
      image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&q=80',
    },
    {
      title: 'Support Local',
      highlight: 'East African Businesses',
      description: 'Empowering local entrepreneurs and artisans. Every purchase makes a difference.',
      image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&q=80',
    },
  ]

  // Build stats array based on real data
  const displayStats: Array<{
    label: string;
    value: string;
    icon: typeof ShoppingBag;
  }> = []
  
  // Only show products if we have a milestone achieved
  if (stats?.products?.milestone) {
    displayStats.push({ 
      label: 'Products', 
      value: stats.products.milestone, 
      icon: ShoppingBag 
    })
  }
  
  // Only show sellers if we have a milestone achieved
  if (stats?.sellers?.milestone) {
    displayStats.push({ 
      label: 'Sellers', 
      value: stats.sellers.milestone, 
      icon: Star 
    })
  }
  
  // Always show countries - it's accurate
  displayStats.push({ 
    label: 'Countries', 
    value: '4', 
    icon: Truck 
  })
  
  // Only show customers if we have a milestone achieved
  if (stats?.customers?.milestone) {
    displayStats.push({ 
      label: 'Customers', 
      value: stats.customers.milestone, 
      icon: Users 
    })
  }

  return (
    <section ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <motion.div style={{ y }} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.12_0.02_45)] via-[oklch(0.18_0.03_45)] to-[oklch(0.15_0.04_55)]" />
        
        {/* Animated Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, oklch(0.6 0.2 35 / 40%) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, oklch(0.55 0.15 140 / 30%) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, oklch(0.75 0.14 80 / 20%) 0%, transparent 70%)' }}
        />

        {/* African Pattern Overlay */}
        <div className="absolute inset-0 african-pattern opacity-30" />
      </motion.div>

      {/* Main Content */}
      <motion.div style={{ opacity }} className="relative z-10 container mx-auto px-4 pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Badge - Honest messaging */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(1_0_0/20%)] mb-8"
            >
              <Sparkles className="w-4 h-4 text-[oklch(0.75_0.14_80)]" />
              <span className="text-sm font-medium text-white/90">
                {platform?.phase === 'launch' 
                  ? 'New Marketplace • Fresh Opportunities' 
                  : platform?.phase === 'early'
                  ? 'Growing Marketplace • Join the Movement'
                  : platform?.phase === 'growing'
                  ? 'Trusted Marketplace • Real Results'
                  : 'East Africa\'s Trusted Marketplace'}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6"
            >
              {slides[currentSlide].title}{' '}
              <span className="relative">
                <span className="text-gradient">{slides[currentSlide].highlight}</span>
                <motion.div
                  className="absolute -bottom-2 left-0 right-0 h-1 rounded-full"
                  style={{ background: 'linear-gradient(90deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                />
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-white/70 mb-10 max-w-lg mx-auto lg:mx-0"
            >
              {slides[currentSlide].description}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <Link href="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Shop Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, oklch(0.55 0.15 140), oklch(0.6 0.2 35))' }}
                  />
                </motion.button>
              </Link>
              <Link href="/seller">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white border border-white/30 glass hover:border-white/50 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Become a Seller
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats - Only show real milestones */}
            {displayStats.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-6"
              >
                {displayStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="text-center lg:text-left"
                  >
                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-white/60">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* If no milestones yet, show value props instead */}
            {displayStats.length <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-6"
              >
                {[
                  { icon: Shield, text: 'Buyer Protection' },
                  { icon: Truck, text: 'East Africa Delivery' },
                  { icon: Star, text: 'Quality Products' },
                ].map((item, index) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center gap-2 text-white/80"
                  >
                    <item.icon className="w-5 h-5 text-[oklch(0.75_0.14_80)]" />
                    <span className="text-sm font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Right Content - 3D Product Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Rotating Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-white/10"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-4 rounded-full border border-white/10"
              />

              {/* Central Product Card */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-16 glass rounded-3xl p-6 border border-white/20 shadow-2xl"
              >
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  <img
                    src={slides[currentSlide].image}
                    alt="Featured Product"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-white font-semibold mb-1">Start Shopping</div>
                    <div className="text-white/70 text-sm">Quality products await</div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Feature Cards */}
              <motion.div
                animate={{ y: [-5, 5, -5], x: [-3, 3, -3] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-4 left-4 glass rounded-2xl p-4 border border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, oklch(0.55 0.15 140), oklch(0.45 0.14 155))' }}>
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">Cross-Border Delivery</div>
                    <div className="text-white/60 text-xs">4 East African countries</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5], x: [3, -3, 3] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-4 right-4 glass rounded-2xl p-4 border border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.75 0.14 80))' }}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">Escrow Protection</div>
                    <div className="text-white/60 text-xs">Secure payments always</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Slide Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-3 mt-12"
        >
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-12 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            className="fill-[oklch(0.99_0.005_85)] dark:fill-[oklch(0.12_0.02_45)]"
          />
        </svg>
      </div>
    </section>
  )
}
