'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { Header } from '@/components/home/header'
import { HeroSection } from '@/components/home/hero-section'
import { CategoryShowcase } from '@/components/home/category-showcase'
import { FeaturedProducts } from '@/components/home/featured-products'
import { FlashSales } from '@/components/home/flash-sales'
import { TrustSection } from '@/components/home/trust-section'
import { SellerShowcase } from '@/components/home/seller-showcase'
import { Footer } from '@/components/home/footer'

export default function Home() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 origin-left z-[100]"
        style={{ 
          scaleX, 
          background: 'linear-gradient(90deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140), oklch(0.75 0.14 80))' 
        }}
      />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Trust Indicators - Compact */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="py-8 bg-white dark:bg-[oklch(0.15_0.02_45)] border-y border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]"
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              {[
                { emoji: '🛡️', text: 'Buyer Protection' },
                { emoji: '✅', text: 'Verified Sellers' },
                { emoji: '💳', text: 'Secure Checkout' },
                { emoji: '🎯', text: 'Dedicated Support' },
              ].map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 group cursor-default"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{item.emoji}</span>
                  <span className="font-medium text-[oklch(0.45_0.02_45)] dark:text-white/90 group-hover:text-[oklch(0.6_0.2_35)] dark:group-hover:text-[oklch(0.75_0.14_80)] transition-colors">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Category Showcase */}
        <CategoryShowcase />

        {/* Featured Products */}
        <FeaturedProducts />

        {/* Flash Sales */}
        <FlashSales />

        {/* Trust Section */}
        <TrustSection />

        {/* Seller Showcase */}
        <SellerShowcase />

        {/* Seller-First CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-16 md:py-24 bg-gradient-to-br from-[oklch(0.96_0.02_85)] via-white to-[oklch(0.98_0.01_85)] dark:from-[oklch(0.15_0.02_45)] dark:via-[oklch(0.14_0.02_45)] dark:to-[oklch(0.18_0.02_45)]"
        >
          <div className="container mx-auto px-4">
            {/* Main CTA - Seller Focused */}
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[oklch(0.6_0.2_35/10%)] dark:bg-[oklch(0.6_0.2_35/20%)] mb-6"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)]">
                    Now accepting sellers across East Africa
                  </span>
                </motion.div>

                {/* Headline */}
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-4">
                  Start Selling on{' '}
                  <span className="bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] bg-clip-text text-transparent">
                    DuukaAfrica
                  </span>
                </h2>
                <p className="text-lg md:text-xl text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] max-w-2xl mx-auto">
                  Your gateway to millions of buyers across Uganda, Kenya, Tanzania, Rwanda, and beyond.
                </p>
              </motion.div>

              {/* Benefits Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10"
              >
                {[
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: 'Free Store Setup',
                    description: 'Create your online store in minutes at no cost'
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: 'East Africa Reach',
                    description: 'Access customers across Uganda, Kenya, Tanzania & more'
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ),
                    title: 'Secure Payments',
                    description: 'Protected transactions with automatic payouts'
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: 'Low Commission',
                    description: 'Keep more of your profits with competitive rates'
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ),
                    title: 'Analytics Dashboard',
                    description: 'Track sales, views, and grow your business'
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ),
                    title: 'Dedicated Support',
                    description: 'Get help when you need it from our team'
                  },
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-[oklch(0.18_0.02_45)] shadow-sm border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.25_0.02_45)]"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[oklch(0.6_0.2_35/10%)] to-[oklch(0.55_0.15_140/10%)] text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)]">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[oklch(0.15_0.02_45)] dark:text-white mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Primary CTA - Seller */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-center mb-8"
              >
                <motion.a
                  href="/seller/register"
                  whileHover={{ scale: 1.02, boxShadow: '0 25px 50px oklch(0.6 0.2 35 / 25%)' }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-3 px-10 py-4 md:px-12 md:py-5 rounded-2xl font-semibold text-white text-lg md:text-xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                >
                  <span>Become a Seller</span>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-sm">It&apos;s Free</span>
                </motion.a>
              </motion.div>

              {/* Secondary CTA - Shopper */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-center pt-6 border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.25_0.02_45)]"
              >
                <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-3">
                  Looking to shop instead?
                </p>
                <motion.a
                  href="/products"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)] border-2 border-[oklch(0.6_0.2_35)] dark:border-[oklch(0.75_0.14_80)] hover:bg-[oklch(0.6_0.2_35/5%)] dark:hover:bg-[oklch(0.75_0.14_80/10%)] transition-colors"
                >
                  <span>Browse Products</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </motion.a>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
