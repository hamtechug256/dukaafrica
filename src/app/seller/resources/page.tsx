'use client'

import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Video,
  FileText,
  Download,
  ChevronRight,
  HelpCircle,
  BookMarked,
  DollarSign,
  Headphones,
  ArrowRight,
} from 'lucide-react'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

export default function SellerResourcesPage() {
  const guides = [
    { title: 'Getting Started Guide', description: 'Learn the basics of setting up your store', type: 'PDF', icon: FileText },
    { title: 'Product Photography Tips', description: 'Take stunning product photos that sell', type: 'PDF', icon: FileText },
    { title: 'Pricing Strategy', description: 'How to price your products competitively', type: 'PDF', icon: FileText },
    { title: 'Shipping Best Practices', description: 'Efficient shipping for happy customers', type: 'PDF', icon: FileText },
  ]

  const quickLinks = [
    { title: 'Seller Guidelines', description: 'Best practices for selling on DuukaAfrica', href: '/seller/guidelines', icon: BookMarked },
    { title: 'Fees & Pricing', description: 'Commission rates, tiers, and payout info', href: '/seller/fees', icon: DollarSign },
    { title: 'Help Center', description: 'FAQs, support, and troubleshooting', href: '/help', icon: HelpCircle },
    { title: 'Contact Support', description: 'Get in touch with our support team', href: '/contact', icon: Headphones },
  ]

  const articles = [
    { title: 'How to Handle Customer Complaints', href: '/help', category: 'Customer Service', readTime: '5 min' },
    { title: 'Understanding DuukaAfrica Fees', href: '/seller/fees', category: 'Business', readTime: '4 min' },
    { title: 'Flash Sales Strategy', href: '/seller/guidelines', category: 'Marketing', readTime: '5 min' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <div
          className="text-white"
          style={{
            background:
              'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40), oklch(0.55 0.15 140))',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div {...fadeIn}>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Seller Resources</h1>
              <p className="text-white/70">
                Everything you need to succeed on DuukaAfrica
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Quick Links */}
          <motion.div className="mb-12" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link, index) => (
                <Link key={index} href={link.href}>
                  <Card className="hover:shadow-md transition-shadow h-full cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                          <link.icon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{link.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {link.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Guides */}
          <motion.div className="mb-12" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">Downloadable Guides</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {guides.map((guide, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <guide.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{guide.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {guide.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {guide.type}
                      </span>
                      <Link href="/help">
                        <Button variant="ghost" size="sm" disabled className="opacity-60">
                          <Download className="w-4 h-4 mr-1" /> Coming Soon
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Downloadable guides coming soon. In the meantime, visit our{' '}
              <Link href="/help" className="text-primary hover:underline">
                Help Center
              </Link>{' '}
              for assistance.
            </p>
          </motion.div>

          {/* Videos */}
          <motion.div className="mb-12" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">Video Tutorials</h2>
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Video Tutorials Coming Soon</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                We&apos;re working on comprehensive video tutorials to help you master selling
                on DuukaAfrica. Stay tuned!
              </p>
              <Link href="/help">
                <Button variant="outline">
                  Visit Help Center
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Articles */}
          <motion.div className="mb-12" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">Help Center Articles</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article, index) => (
                <Link key={index} href={article.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        <span className="text-xs text-gray-500">{article.readTime}</span>
                      </div>
                      <h3 className="font-semibold mb-2">{article.title}</h3>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-primary"
                      >
                        Read Article <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/help">
                <Button variant="outline">
                  View All Help Articles
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Support CTA */}
          <motion.div {...fadeIn}>
            <Card
              className="text-white border-0"
              style={{
                background:
                  'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40), oklch(0.55 0.15 140))',
              }}
            >
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Need More Help?</h2>
                <p className="text-white/80 mb-6">
                  Our seller support team is here to help you succeed
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/help">
                    <Button className="bg-white text-gray-900 hover:bg-gray-100">
                      Contact Support
                    </Button>
                  </Link>
                  <Link href="/seller/register">
                    <Button
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                    >
                      Start Selling
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
