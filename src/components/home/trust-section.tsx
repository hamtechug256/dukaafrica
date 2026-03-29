'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Truck, CreditCard, Headphones, Award, Clock, Package, RefreshCw, MapPin, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// Fetch real homepage stats
async function fetchHomepageStats() {
  const res = await fetch('/api/homepage/stats')
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

const trustFeatures = [
  {
    icon: Shield,
    title: 'Buyer Protection',
    description: 'Your payments are held in escrow until you confirm delivery',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    icon: Truck,
    title: 'Cross-Border Delivery',
    description: 'Reliable shipping across Uganda, Kenya, Tanzania & Rwanda',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: CreditCard,
    title: 'Secure Payment',
    description: 'Mobile money, cards & bank transfer with bank-grade security',
    color: 'from-purple-500 to-violet-500',
  },
  {
    icon: Headphones,
    title: 'Dedicated Support',
    description: 'Our team is here to help resolve any issues quickly',
    color: 'from-orange-500 to-amber-500',
  },
]

export function TrustSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  // Fetch real stats
  const { data: statsData } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: fetchHomepageStats,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const stats = statsData?.stats
  const platform = statsData?.platform

  // Build achievements array based on REAL data only
  const achievements: Array<{
    number: string;
    label: string;
    icon: typeof MapPin;
    alwaysShow?: boolean;
    milestone?: string;
  }> = []
  
  // Countries - always show (it's accurate)
  achievements.push({ 
    number: '4', 
    label: 'Countries Served', 
    icon: MapPin,
    alwaysShow: true,
  })

  // Products - only show if milestone reached
  if (stats?.products?.milestone) {
    achievements.push({ 
      number: stats.products.milestone.replace('+', ''), 
      label: 'Products Listed', 
      icon: Package,
      milestone: stats.products.milestone,
    })
  }

  // Sellers - only show if milestone reached
  if (stats?.sellers?.milestone) {
    achievements.push({ 
      number: stats.sellers.milestone.replace('+', '').replace('Trusted ', ''), 
      label: 'Sellers', 
      icon: Users,
      milestone: stats.sellers.milestone,
    })
  }

  // Customers - only show if milestone reached
  if (stats?.customers?.milestone) {
    achievements.push({ 
      number: stats.customers.milestone.replace('+', '').replace(' Happy', ''), 
      label: 'Happy Customers', 
      icon: Award,
      milestone: stats.customers.milestone,
    })
  }

  return (
    <section ref={containerRef} className="py-20 bg-white dark:bg-[oklch(0.15_0.02_45)]">
      <div className="container mx-auto px-4">
        {/* Trust Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {trustFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-gradient-to-br from-[oklch(0.99_0.005_85)] to-[oklch(0.96_0.01_85)] dark:from-[oklch(0.18_0.02_45)] dark:to-[oklch(0.22_0.02_45)] p-6 rounded-2xl border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.25_0.02_45)] hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Hover Gradient */}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.05 }}
                className={`absolute inset-0 bg-gradient-to-br ${feature.color}`}
              />

              {/* Icon */}
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${feature.color} shadow-lg`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </motion.div>

              <h3 className="text-lg font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-2 group-hover:text-[oklch(0.6_0.2_35)] dark:group-hover:text-[oklch(0.75_0.14_80)] transition-colors">
                {feature.title}
              </h3>
              <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] text-sm">
                {feature.description}
              </p>

              {/* Corner Decoration */}
              <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_35/10%)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section - Only show real achievements */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.6_0.2_35)] via-[oklch(0.55_0.18_40)] to-[oklch(0.55_0.15_140)]" />
          <div className="absolute inset-0 african-pattern opacity-20" />
          
          {/* Decorative Blobs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl bg-white/10"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl bg-white/10"
          />

          <div className="relative z-10 p-8 md:p-12">
            <div className="text-center mb-10">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 }}
                className="text-2xl md:text-3xl font-bold text-white mb-3"
              >
                {platform?.phase === 'launch' 
                  ? 'Building East Africa\'s Marketplace'
                  : platform?.phase === 'early'
                  ? 'Growing Together'
                  : platform?.phase === 'growing'
                  ? 'Trusted Across East Africa'
                  : 'East Africa\'s Trusted Marketplace'}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 }}
                className="text-white/80"
              >
                {platform?.phase === 'launch' 
                  ? 'Join us from the beginning and be part of something great'
                  : 'Real numbers from real business'}
              </motion.p>
            </div>

            {/* Achievement Grid */}
            <div className={`grid gap-8 ${achievements.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : achievements.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' : achievements.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <achievement.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ delay: 0.7 + index * 0.1, type: 'spring' }}
                    className="text-3xl md:text-4xl font-bold text-white mb-1"
                  >
                    {achievement.number}
                  </motion.div>
                  <div className="text-white/70 text-sm">{achievement.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Quick Info Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-10 border-t border-white/20"
            >
              {[
                { icon: Clock, text: 'Quick Dispatch' },
                { icon: RefreshCw, text: 'Fair Returns Policy' },
                { icon: Shield, text: 'Escrow Protection' },
              ].map((item, index) => (
                <motion.div
                  key={item.text}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 text-white/90"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
