'use client'

import { motion } from 'framer-motion'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Store, Truck, CreditCard, Shield, Headphones, TrendingUp, 
  Users, Package, ChevronRight, CheckCircle, Sparkles, ArrowRight 
} from 'lucide-react'

export default function SellerLearnMorePage() {
  const benefits = [
    { icon: Store, title: 'Easy Store Setup', desc: 'Create your store in minutes with our intuitive dashboard' },
    { icon: Truck, title: 'Logistics Support', desc: 'Access discounted shipping rates across East Africa' },
    { icon: CreditCard, title: 'Secure Payments', desc: 'Get paid securely via Mobile Money or bank transfer' },
    { icon: Shield, title: 'Seller Protection', desc: 'Protected against fraudulent buyers and chargebacks' },
    { icon: Headphones, title: '24/7 Support', desc: 'Dedicated seller support team to help you succeed' },
    { icon: TrendingUp, title: 'Growth Tools', desc: 'Analytics, promotions, and marketing tools to grow sales' },
  ]

  const steps = [
    { step: 1, title: 'Create Account', desc: 'Sign up and verify your identity' },
    { step: 2, title: 'Set Up Store', desc: 'Add your store details and branding' },
    { step: 3, title: 'List Products', desc: 'Upload products with photos and descriptions' },
    { step: 4, title: 'Start Selling', desc: 'Receive orders and grow your business' },
  ]

  const stats = [
    { value: '50,000+', label: 'Active Sellers' },
    { value: '10M+', label: 'Monthly Visitors' },
    { value: '4 Countries', label: 'Market Reach' },
    { value: '95%', label: 'Seller Satisfaction' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      
      <main className="flex-1">
        {/* Hero - African Theme */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.6_0.2_35)] via-[oklch(0.55_0.18_40)] to-[oklch(0.55_0.15_140)]" />
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4" />
                  <span>Now accepting sellers across East Africa</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Start Selling on{' '}
                  <span className="bg-gradient-to-r from-white to-[oklch(0.75_0.14_80)] bg-clip-text text-transparent">
                    DuukaAfrica
                  </span>
                </h1>
                
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Join thousands of successful sellers across East Africa. Reach millions of customers with zero listing fees and grow your business.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/seller/register">
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-4 rounded-2xl bg-white text-[oklch(0.6_0.2_35)] font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
                    >
                      Start Selling Free
                    </motion.button>
                  </Link>
                  <Link href="/seller/fees">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-4 rounded-2xl border-2 border-white text-white font-semibold text-lg hover:bg-white/10 transition-colors"
                    >
                      View Pricing
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
              
              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden lg:block"
              >
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20"
                    >
                      <div className="text-3xl font-bold text-white">{stat.value}</div>
                      <div className="text-white/70 text-sm mt-1">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-4">
              Why Sell on DuukaAfrica?
            </h2>
            <p className="text-lg text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] max-w-2xl mx-auto">
              Everything you need to succeed in the East African market
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] bg-white dark:bg-[oklch(0.18_0.02_45)]">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
                    >
                      <benefit.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg text-[oklch(0.15_0.02_45)] dark:text-white mb-2">{benefit.title}</h3>
                    <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">{benefit.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white dark:bg-[oklch(0.15_0.02_45)] py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-4">
                How It Works
              </h2>
              <p className="text-lg text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                Get started in 4 simple steps
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))' }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg text-[oklch(0.15_0.02_45)] dark:text-white mb-2">{item.title}</h3>
                  <p className="text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* What You Can Sell */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-4">
              What Can You Sell?
            </h2>
            <p className="text-lg text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
              Sell almost anything on DuukaAfrica
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Electronics', 'Fashion', 'Home & Garden', 'Beauty', 'Sports', 'Vehicles', 'Food & Grocery', 'Services'].map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card className="cursor-pointer border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] bg-white dark:bg-[oklch(0.18_0.02_45)] hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6 text-center font-medium text-[oklch(0.25_0.02_45)] dark:text-white">
                    {category}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA - African Theme */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.6_0.2_35)] via-[oklch(0.55_0.18_40)] to-[oklch(0.55_0.15_140)]" />
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
          
          <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Start Selling?
              </h2>
              <p className="text-xl text-white/90 mb-8">
                Join DuukaAfrica today and start reaching millions of customers across East Africa.
              </p>
              <Link href="/seller/register">
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  className="px-10 py-4 rounded-2xl bg-white text-[oklch(0.6_0.2_35)] font-semibold text-lg shadow-lg inline-flex items-center gap-2"
                >
                  Create Your Store
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
