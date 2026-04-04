'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Header } from '@/components/home/header'
import { HeroSection } from '@/components/home/hero-section'
import { HowItWorksSection } from '@/components/home/how-it-works-section'
import { LivePulseTicker } from '@/components/home/live-pulse-ticker'
import { CategoryShowcase } from '@/components/home/category-showcase'
import { FeaturedProducts } from '@/components/home/featured-products'
import { FlashSales } from '@/components/home/flash-sales'
import { TrustSection } from '@/components/home/trust-section'
import { SellerShowcase } from '@/components/home/seller-showcase'
import { Footer } from '@/components/home/footer'

// ── Fetch all homepage settings in one call ──
async function fetchHomepageSettings() {
  const res = await fetch('/api/homepage/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export default function HomePage() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  // Single query for all settings (cached 5 min)
  const { data: settingsData } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: fetchHomepageSettings,
    staleTime: 1000 * 60 * 5,
  })

  const settings = settingsData?.settings
  const sections = settings?.sections
  const trustIndicators = settings?.trust?.trust_indicators || []
  const sellerCta = settings?.sellerCta

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 origin-left z-[100]"
        style={{
          scaleX,
          background:
            'linear-gradient(90deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140), oklch(0.75 0.14 80))',
        }}
      />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        {sections?.section_hero_visible !== false && <HeroSection />}

        {/* Trust Indicators - Compact Bar */}
        {sections?.section_trust_bar_visible !== false && trustIndicators.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="py-8 bg-white dark:bg-[oklch(0.15_0.02_45)] border-y border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]"
          >
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                {trustIndicators.map((item: { emoji: string; text: string }, index: number) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-3 group cursor-default"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {item.emoji}
                    </span>
                    <span className="font-medium text-[oklch(0.45_0.02_45)] dark:text-white/90 group-hover:text-[oklch(0.6_0.2_35)] dark:group-hover:text-[oklch(0.75_0.14_80)] transition-colors">
                      {item.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Live Pulse Ticker */}
        <LivePulseTicker />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Category Showcase */}
        {sections?.section_categories_visible !== false && <CategoryShowcase />}

        {/* Featured Products */}
        {sections?.section_featured_visible !== false && <FeaturedProducts />}

        {/* Flash Sales */}
        {sections?.section_flash_sales_visible !== false && <FlashSales />}

        {/* Trust Section */}
        {sections?.section_trust_section_visible !== false && <TrustSection />}

        {/* Seller Showcase */}
        {sections?.section_seller_showcase_visible !== false && <SellerShowcase />}

        {/* Seller CTA Section */}
        {sections?.section_seller_cta_visible !== false && (
          <SellerCtaSection config={sellerCta} />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

// ── Seller CTA Section (extracted, admin-configurable) ──
function SellerCtaSection({ config }: { config: Record<string, any> }) {
  const benefits = config?.seller_cta_benefits || []

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-16 md:py-24 bg-gradient-to-br from-[oklch(0.96_0.02_85)] via-white to-[oklch(0.98_0.01_85)] dark:from-[oklch(0.15_0.02_45)] dark:via-[oklch(0.14_0.02_45)] dark:to-[oklch(0.18_0.02_45)]"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[oklch(0.6_0.2_35/10%)] dark:bg-[oklch(0.6_0.2_35/20%)] mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)]">
                {config?.seller_cta_badge || 'Now accepting sellers across East Africa'}
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-4">
              {config?.seller_cta_title_1 || 'Start Selling on'}{' '}
              <span className="bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] bg-clip-text text-transparent">
                {config?.seller_cta_title_highlight || 'DuukaAfrica'}
              </span>
            </h2>
            <p className="text-lg md:text-xl text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] max-w-2xl mx-auto">
              {config?.seller_cta_description ||
                'Your gateway to millions of buyers across Uganda, Kenya, Tanzania, Rwanda, and beyond.'}
            </p>
          </motion.div>

          {/* Benefits Grid */}
          {benefits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10"
            >
              {benefits.map(
                (benefit: { title: string; description: string }, index: number) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-[oklch(0.18_0.02_45)] shadow-sm border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.25_0.02_45)]"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-[oklch(0.6_0.2_35/10%)] to-[oklch(0.55_0.15_140/10%)]">
                      <span className="text-lg text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)] font-bold">
                        {benefit.title.charAt(0)}
                      </span>
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
                ),
              )}
            </motion.div>
          )}

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <Link href="/seller/register">
              <motion.div
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 25px 50px oklch(0.6 0.2 35 / 25%)',
                }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-10 py-4 md:px-12 md:py-5 rounded-2xl font-semibold text-white text-lg md:text-xl shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))',
                }}
              >
                <span>Become a Seller</span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-sm">It&apos;s Free</span>
              </motion.div>
            </Link>
          </motion.div>

          {/* Secondary CTA */}
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
            <Link href="/products">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)] border-2 border-[oklch(0.6_0.2_35)] dark:border-[oklch(0.75_0.14_80)] hover:bg-[oklch(0.6_0.2_35/5%)] dark:hover:bg-[oklch(0.75_0.14_80/10%)] transition-colors"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
