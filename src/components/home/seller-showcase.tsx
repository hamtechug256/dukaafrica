'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Star, MapPin, BadgeCheck, Store, TrendingUp, Users, Package, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// Fetch real featured sellers
async function fetchFeaturedSellers() {
  const res = await fetch('/api/homepage/featured-sellers')
  if (!res.ok) throw new Error('Failed to fetch sellers')
  return res.json()
}

const sellingBenefits = [
  { icon: Store, title: 'Create Your Store', description: 'Set up your online shop in minutes' },
  { icon: Package, title: 'List Products', description: 'Upload products with our easy tools' },
  { icon: Users, title: 'Reach Customers', description: 'Connect with buyers across East Africa' },
  { icon: TrendingUp, title: 'Grow Sales', description: 'Scale your business with our tools' },
]

export function SellerShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  // Fetch real sellers
  const { data: sellersData, isLoading } = useQuery({
    queryKey: ['featured-sellers'],
    queryFn: fetchFeaturedSellers,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const sellers = sellersData?.sellers || []
  const hasSellers = sellersData?.hasSellers && sellers.length > 0

  return (
    <section ref={containerRef} className="py-20 bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <div className="container mx-auto px-4">
        {/* Become a Seller CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-16"
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.55_0.15_140)] via-[oklch(0.5_0.12_150)] to-[oklch(0.45_0.14_155)]" />
            <div className="absolute inset-0 african-pattern opacity-30" />
            
            {/* Decorative Elements */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-20 -right-20 w-80 h-80 border border-white/10 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
              className="absolute -bottom-32 -left-32 w-96 h-96 border border-white/10 rounded-full"
            />

            <div className="relative z-10 p-8 md:p-12 lg:p-16">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                {/* Left Content */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-6"
                  >
                    <Sparkles className="w-4 h-4" />
                    {hasSellers ? 'Join Our Growing Seller Community' : 'Be a Founding Seller'}
                  </motion.div>
                  
                  <motion.h2
                    initial={{ opacity: 0, x: -30 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
                  >
                    {hasSellers ? 'Grow Your Business on' : 'Start Selling on'}{' '}
                    <span className="relative">
                      DuukaAfrica
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={isInView ? { scaleX: 1 } : {}}
                        transition={{ delay: 0.6 }}
                        className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-[oklch(0.75_0.14_80)]"
                      />
                    </span>
                  </motion.h2>
                  
                  <motion.p
                    initial={{ opacity: 0, x: -30 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-white/80 mb-8 max-w-lg"
                  >
                    {hasSellers 
                      ? 'Join other entrepreneurs growing their businesses across East Africa. Create your store, list your products, and start selling today.'
                      : 'Be among the first to sell on DuukaAfrica. Founding sellers get premium placement, zero listing fees, and dedicated support to help you succeed.'}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-4"
                  >
                    <Link href="/seller/register">
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 rounded-2xl font-semibold text-[oklch(0.55_0.15_140)] bg-white shadow-xl hover:bg-gray-50 transition-colors"
                      >
                        {hasSellers ? 'Start Selling Free' : 'Be a Founding Seller'}
                      </motion.button>
                    </Link>
                    <Link href="/seller/learn-more">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 rounded-2xl font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
                      >
                        Learn More
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>

                {/* Right - Benefits */}
                <div className="grid grid-cols-2 gap-4">
                  {sellingBenefits.map((benefit, index) => (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 30 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                        <benefit.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                      <p className="text-sm text-white/70">{benefit.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Featured Sellers - Only show if we have real sellers */}
        {hasSellers && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-2">
                  Trusted Sellers
                </h2>
                <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                  {sellers.filter((s: any) => s.isVerified).length > 0 
                    ? 'Verified sellers you can trust'
                    : 'Sellers on our platform'}
                </p>
              </div>
              {sellers.length > 4 && (
                <Link href="/stores" className="hidden md:block">
                  <motion.button
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.65_0.18_35)] border-2 border-[oklch(0.6_0.2_35)] dark:border-[oklch(0.65_0.18_35)] hover:bg-[oklch(0.6_0.2_35/5%)] transition-colors"
                  >
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sellers.slice(0, 4).map((seller: any, index: number) => (
                <motion.div
                  key={seller.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Link href={`/stores/${seller.slug}`}>
                    <motion.div
                      whileHover={{ y: -8 }}
                      className="group bg-white dark:bg-[oklch(0.18_0.02_45)] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.25_0.02_45)]"
                    >
                      {/* Cover Image */}
                      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-[oklch(0.55_0.15_140/20%)] to-[oklch(0.6_0.2_35/20%)]">
                        {seller.banner && seller.banner !== '/images/store-banner-placeholder.png' ? (
                          <img
                            src={seller.banner}
                            alt={seller.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store className="w-12 h-12 text-[oklch(0.55_0.15_140/30%)]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        
                        {/* Logo */}
                        <div className="absolute -bottom-6 left-4">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="w-14 h-14 rounded-xl border-4 border-white dark:border-[oklch(0.18_0.02_45)] overflow-hidden shadow-lg bg-white dark:bg-[oklch(0.18_0.02_45)]"
                          >
                            {seller.logo && seller.logo !== '/images/store-placeholder.png' ? (
                              <img
                                src={seller.logo}
                                alt={seller.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[oklch(0.55_0.15_140/20%)]">
                                <Store className="w-6 h-6 text-[oklch(0.55_0.15_140)]" />
                              </div>
                            )}
                          </motion.div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 pt-8">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-[oklch(0.15_0.02_45)] dark:text-white flex items-center gap-1">
                              {seller.name}
                              {seller.isVerified && (
                                <BadgeCheck className="w-4 h-4 text-[oklch(0.55_0.15_140)]" />
                              )}
                            </h3>
                            {seller.verificationTier && seller.verificationTier !== 'STARTER' && (
                              <p className="text-xs text-[oklch(0.55_0.15_140)] font-medium">
                                {seller.verificationTier} Seller
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        {seller.rating > 0 && (
                          <div className="flex items-center gap-3 text-sm mb-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-[oklch(0.75_0.14_80)] text-[oklch(0.75_0.14_80)]" />
                              <span className="font-medium text-[oklch(0.15_0.02_45)] dark:text-white">{seller.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        )}

                        {/* Location & Products */}
                        <div className="flex items-center justify-between text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                          {seller.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {seller.location}
                            </div>
                          )}
                          <span>{seller.productCount} products</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Mobile View All */}
            {sellers.length > 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.8 }}
                className="md:hidden mt-8 text-center"
              >
                <Link href="/stores">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                  >
                    View All Sellers
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* If no sellers yet - show recruitment CTA */}
        {!hasSellers && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="text-center py-12"
          >
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[oklch(0.55_0.15_140)] to-[oklch(0.45_0.14_155)] flex items-center justify-center mx-auto mb-6">
                <Store className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-3">
                Be Our First Seller
              </h3>
              <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-6">
                Get premium homepage placement as a founding seller. Zero listing fees, dedicated support, and first-mover advantage.
              </p>
              <Link href="/seller/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 rounded-xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
                >
                  Register Your Store
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
