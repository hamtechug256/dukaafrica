'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Truck, CreditCard, Headphones, Award, Clock, Package, RefreshCw } from 'lucide-react'

const trustFeatures = [
  {
    icon: Shield,
    title: 'Buyer Protection',
    description: 'Your purchases are protected with our money-back guarantee',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Quick and reliable delivery across East Africa',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: CreditCard,
    title: 'Secure Payment',
    description: 'Multiple payment options with bank-grade security',
    color: 'from-purple-500 to-violet-500',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Our dedicated team is here to help anytime',
    color: 'from-orange-500 to-amber-500',
  },
]

const achievements = [
  { number: '100K+', label: 'Happy Customers', icon: Award },
  { number: '2,500+', label: 'Verified Sellers', icon: Package },
  { number: '50K+', label: 'Products Listed', icon: Shield },
  { number: '4', label: 'Countries Served', icon: Truck },
]

export function TrustSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

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

        {/* Stats Section */}
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
                Trusted Across East Africa
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 }}
                className="text-white/80"
              >
                Join thousands of satisfied customers and sellers
              </motion.p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
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
                { icon: Clock, text: 'Quick 48hr Dispatch' },
                { icon: RefreshCw, text: 'Easy Returns' },
                { icon: Shield, text: 'Secure Shopping' },
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
