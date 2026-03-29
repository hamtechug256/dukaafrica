'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { Header } from '@/components/home/header'
import { HeroSection } from '@/components/home/hero-section'
import { CategoryShowcase } from '@/components/home/category-showcase'
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
                { emoji: '🎧', text: '24/7 Support' },
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

        {/* Flash Sales */}
        <FlashSales />

        {/* Trust Section */}
        <TrustSection />

        {/* Seller Showcase */}
        <SellerShowcase />

        {/* Newsletter CTA */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-16 bg-gradient-to-br from-[oklch(0.96_0.02_85)] to-[oklch(0.98_0.01_85)] dark:from-[oklch(0.15_0.02_45)] dark:to-[oklch(0.18_0.02_45)]"
        >
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="inline-block mb-6"
            >
              <span className="text-5xl">🎉</span>
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-3">
              Ready to Start Shopping?
            </h2>
            <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-8 max-w-lg mx-auto">
              Join thousands of happy customers across East Africa. Create your free account and start shopping today.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px oklch(0.6 0.2 35 / 30%)' }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 rounded-2xl font-semibold text-white text-lg"
              style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
            >
              Create Free Account
            </motion.button>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
