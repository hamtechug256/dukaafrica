'use client'

import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'

const categories = [
  {
    name: 'Electronics',
    description: 'Latest gadgets & tech',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80',
    count: '12,500+ Products',
    color: 'from-blue-500 to-cyan-500',
    size: 'large',
  },
  {
    name: 'Fashion',
    description: 'Trendy styles for all',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80',
    count: '25,000+ Products',
    color: 'from-pink-500 to-rose-500',
    size: 'medium',
  },
  {
    name: 'Home & Living',
    description: 'Transform your space',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    count: '8,300+ Products',
    color: 'from-amber-500 to-orange-500',
    size: 'medium',
  },
  {
    name: 'Beauty',
    description: 'Glow with confidence',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
    count: '6,800+ Products',
    color: 'from-purple-500 to-violet-500',
    size: 'small',
  },
  {
    name: 'Sports',
    description: 'Gear up for victory',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    count: '4,200+ Products',
    color: 'from-green-500 to-emerald-500',
    size: 'small',
  },
  {
    name: 'Groceries',
    description: 'Fresh & delivered',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
    count: '15,000+ Products',
    color: 'from-lime-500 to-green-500',
    size: 'small',
  },
]

export function CategoryShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  return (
    <section ref={containerRef} className="py-20 bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-12"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[oklch(0.6_0.2_35/10%)] text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.65_0.18_35)] text-sm font-medium mb-4"
            >
              <TrendingUp className="w-4 h-4" />
              Trending Categories
            </motion.div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-3">
              Shop by Category
            </h2>
            <p className="text-lg text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] max-w-xl">
              Explore our curated collections from trusted sellers across East Africa
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 }}
          >
            <Link href="/categories">
              <motion.button
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.65_0.18_35)] border-2 border-[oklch(0.6_0.2_35)] dark:border-[oklch(0.65_0.18_35)] hover:bg-[oklch(0.6_0.2_35/5%)] transition-colors"
              >
                View All Categories
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Large Card - Electronics */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="col-span-2 row-span-2"
          >
            <Link href="/categories/electronics">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative h-full min-h-[400px] md:min-h-[500px] rounded-3xl overflow-hidden group cursor-pointer"
              >
                <img
                  src={categories[0].image}
                  alt={categories[0].name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                
                {/* Animated Border */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.6 0.2 35 / 50%), oklch(0.55 0.15 140 / 50%))',
                    padding: '2px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm mb-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {categories[0].count}
                  </motion.div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[oklch(0.75_0.14_80)] transition-colors">
                    {categories[0].name}
                  </h3>
                  <p className="text-white/80 text-lg">{categories[0].description}</p>
                  
                  {/* Hover Arrow */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mt-4 text-white font-semibold group-hover:text-[oklch(0.75_0.14_80)]"
                  >
                    <span>Explore</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </motion.div>
                </div>

                {/* Floating Badge */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute top-6 right-6 px-4 py-2 rounded-xl glass text-white font-semibold"
                >
                  🔥 Hot Deals
                </motion.div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Medium Cards - Fashion & Home */}
          {categories.slice(1, 3).map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="col-span-1"
            >
              <Link href={`/categories/${category.name.toLowerCase().replace(' & ', '-')}`}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="relative h-[200px] md:h-[240px] rounded-2xl overflow-hidden group cursor-pointer"
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-60 group-hover:opacity-70 transition-opacity`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl font-bold text-white mb-1">{category.name}</h3>
                    <p className="text-white/80 text-sm">{category.count}</p>
                  </div>

                  {/* Hover Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileHover={{ scale: 1 }}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowRight className="w-5 h-5 text-white" />
                  </motion.div>
                </motion.div>
              </Link>
            </motion.div>
          ))}

          {/* Small Cards - Beauty, Sports, Groceries */}
          {categories.slice(3).map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="col-span-1"
            >
              <Link href={`/categories/${category.name.toLowerCase()}`}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="relative h-[180px] md:h-[200px] rounded-2xl overflow-hidden group cursor-pointer"
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-50 group-hover:opacity-65 transition-opacity`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">{category.name}</h3>
                    <p className="text-white/80 text-xs">{category.count}</p>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="md:hidden mt-8 text-center"
        >
          <Link href="/categories">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
            >
              View All Categories
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
