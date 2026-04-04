'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  FileText,
  Download,
  ExternalLink,
  Star,
  BookOpen,
  HelpCircle,
  Phone,
  ArrowRight,
  FileSpreadsheet,
  FileType2,
  Image as ImageIcon,
  Inbox,
  TrendingUp,
  Truck,
  Megaphone,
} from 'lucide-react'

const CATEGORY_TABS = [
  { value: '', label: 'All' },
  { value: 'SELLER_GUIDE', label: 'Seller Guides' },
  { value: 'PRICING', label: 'Pricing' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'MARKETING', label: 'Marketing' },
]

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'PDF':
      return FileText
    case 'DOC':
    case 'DOCX':
      return FileType2
    case 'XLSX':
      return FileSpreadsheet
    case 'IMAGE':
      return ImageIcon
    default:
      return FileText
  }
}

function getFileIconColor(fileType: string) {
  switch (fileType) {
    case 'PDF':
      return 'text-red-500 bg-red-50 dark:bg-red-950/30'
    case 'DOC':
    case 'DOCX':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30'
    case 'XLSX':
      return 'text-green-500 bg-green-50 dark:bg-green-950/30'
    case 'IMAGE':
      return 'text-purple-500 bg-purple-50 dark:bg-purple-950/30'
    default:
      return 'text-[oklch(0.6_0.2_35)] bg-[oklch(0.6_0.2_35/0.1)]'
  }
}

// Fetch published seller documents
async function fetchSellerDocuments(category?: string) {
  const params = new URLSearchParams({ targetAudience: 'SELLERS', limit: '50' })
  if (category) params.set('category', category)
  const res = await fetch(`/api/documents?${params}`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export default function SellerResourcesPage() {
  const [activeTab, setActiveTab] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seller-documents', activeTab],
    queryFn: () => fetchSellerDocuments(activeTab || undefined),
  })

  const documents = data?.documents || []

  const handleDownload = (doc: any) => {
    if (doc.fileType === 'IMAGE') {
      // For images, show preview (open in new tab)
      window.open(doc.fileUrl, '_blank')
    } else {
      // For documents, use the slug endpoint which increments download count
      window.open(`/api/documents/${doc.slug}`, '_blank')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />

      <main className="flex-1">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-[oklch(0.25_0.02_45)] to-[oklch(0.2_0.03_45)] text-white py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Seller Resources
              </h1>
              <p className="text-white/70 text-lg max-w-xl">
                Everything you need to succeed on DuukaAfrica — guides, templates,
                and tools to grow your business.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-lg font-semibold text-[oklch(0.25_0.02_45)] dark:text-[oklch(0.9_0.01_85)] mb-4">
              Quick Links
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/seller/guidelines', label: 'Seller Guidelines', icon: BookOpen },
                { href: '/seller/fees', label: 'Fee Structure', icon: TrendingUp },
                { href: '/help', label: 'Help Center', icon: HelpCircle },
                { href: '/contact', label: 'Contact Us', icon: Phone },
              ].map((link) => (
                <Link key={link.href} href={link.href}>
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer border border-[oklch(0.9_0.01_85)] dark:border-[oklch(0.25_0.02_45)]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[oklch(0.6_0.2_35/0.1)] flex items-center justify-center flex-shrink-0">
                        <link.icon className="w-5 h-5 text-[oklch(0.6_0.2_35)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[oklch(0.25_0.02_45)] dark:text-[oklch(0.9_0.01_85)]">
                          {link.label}
                        </p>
                        <p className="text-xs text-[oklch(0.5_0.01_85)] flex items-center">
                          Learn more <ArrowRight className="w-3 h-3 ml-1" />
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Category Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.value
                      ? 'bg-[oklch(0.6_0.2_35)] text-white shadow-sm'
                      : 'bg-white dark:bg-[oklch(0.18_0.02_45)] text-[oklch(0.4_0.01_85)] dark:text-[oklch(0.7_0.01_85)] hover:bg-gray-100 dark:hover:bg-[oklch(0.22_0.02_45)] border border-[oklch(0.9_0.01_85)] dark:border-[oklch(0.25_0.02_45)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Documents Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={i}
                  className="border border-[oklch(0.9_0.01_85)] dark:border-[oklch(0.25_0.02_45)]"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="border border-[oklch(0.9_0.01_85)] dark:border-[oklch(0.25_0.02_45)] mb-12">
              <CardContent className="p-12 text-center">
                <HelpCircle className="w-16 h-16 mx-auto text-[oklch(0.6_0.15_25)] mb-4" />
                <h3 className="text-lg font-semibold text-[oklch(0.25_0.02_45)] dark:text-[oklch(0.9_0.01_85)] mb-2">
                  Failed to load resources
                </h3>
                <p className="text-[oklch(0.5_0.01_85)] mb-4">
                  Something went wrong. Please try again later.
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.location.reload()
                  }
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : documents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border border-[oklch(0.9_0.01_85)] dark:border-[oklch(0.25_0.02_45)] mb-12">
                <CardContent className="p-12 text-center">
                  <Inbox className="w-16 h-16 mx-auto text-[oklch(0.7_0.01_85)] mb-4" />
                  <h3 className="text-lg font-semibold text-[oklch(0.25_0.02_45)] dark:text-[oklch(0.9_0.01_85)] mb-2">
                    No resources available yet
                  </h3>
                  <p className="text-[oklch(0.5_0.01_85)] max-w-md mx-auto">
                    {activeTab
                      ? `No ${CATEGORY_TABS.find((t) => t.value === activeTab)?.label.toLowerCase()} resources have been published yet. Check back soon!`
                      : 'Resources are on the way! Check back soon for guides, templates, and tools to help you grow your business.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {documents.map((doc: any, index: number) => {
                const FileIcon = getFileIcon(doc.fileType)
                const iconColor = getFileIconColor(doc.fileType)

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="h-full border border-[oklch(0.9_0.01_85)] dark:border-[oklch(0.25_0.02_45)] hover:shadow-lg transition-all hover:-translate-y-0.5 bg-white dark:bg-[oklch(0.16_0.02_45)]">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-start gap-4 mb-4">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}
                          >
                            <FileIcon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <h3 className="font-semibold text-[oklch(0.2_0.02_45)] dark:text-[oklch(0.95_0.01_85)] line-clamp-2">
                                {doc.title}
                              </h3>
                              {doc.isFeatured && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            {doc.description && (
                              <p className="text-sm text-[oklch(0.5_0.01_85)] mt-1 line-clamp-2">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[oklch(0.55_0.01_85)] mb-4">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-medium border-[oklch(0.85_0.01_85)] dark:border-[oklch(0.3_0.02_45)]"
                          >
                            {doc.category?.replace(/_/g, ' ')}
                          </Badge>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {doc.downloadCount}
                          </span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>

                        <div className="mt-auto">
                          <Button
                            onClick={() => handleDownload(doc)}
                            className="w-full bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] text-white hover:opacity-90 rounded-xl"
                          >
                            {doc.fileType === 'IMAGE' ? (
                              <>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Preview
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Download {doc.fileType}
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Support CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] text-white overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center relative">
                <div className="relative z-10">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">
                    Need More Help?
                  </h2>
                  <p className="text-white/80 mb-8 max-w-lg mx-auto">
                    Our seller support team is here to help you succeed. Get
                    personalized assistance for your business.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/help">
                      <Button
                        size="lg"
                        className="bg-white text-[oklch(0.6_0.2_35)] hover:bg-gray-50 rounded-xl font-medium"
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Contact Support
                      </Button>
                    </Link>
                    <Link href="/seller/register">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10 rounded-xl font-medium"
                      >
                        Start Selling
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
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
