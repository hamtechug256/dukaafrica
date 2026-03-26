import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Video, FileText, Download, ExternalLink, ChevronRight } from 'lucide-react'

export default function SellerResourcesPage() {
  const guides = [
    { title: 'Getting Started Guide', description: 'Learn the basics of setting up your store', type: 'PDF', icon: FileText },
    { title: 'Product Photography Tips', description: 'Take stunning product photos that sell', type: 'PDF', icon: FileText },
    { title: 'Pricing Strategy', description: 'How to price your products competitively', type: 'PDF', icon: FileText },
    { title: 'Shipping Best Practices', description: 'Efficient shipping for happy customers', type: 'PDF', icon: FileText },
  ]

  const videos = [
    { title: 'Store Setup Tutorial', duration: '15 min', description: 'Step-by-step store creation' },
    { title: 'Product Listing Masterclass', duration: '20 min', description: 'Create compelling listings' },
    { title: 'Order Management', duration: '12 min', description: 'Process orders efficiently' },
    { title: 'Using Analytics', duration: '18 min', description: 'Understand your store performance' },
  ]

  const articles = [
    { title: 'How to Handle Customer Complaints', category: 'Customer Service', readTime: '5 min' },
    { title: 'Seasonal Selling Tips', category: 'Marketing', readTime: '7 min' },
    { title: 'Understanding DuukaAfrica Fees', category: 'Business', readTime: '4 min' },
    { title: 'Optimizing Product Descriptions', category: 'SEO', readTime: '6 min' },
    { title: 'Building Customer Loyalty', category: 'Customer Service', readTime: '8 min' },
    { title: 'Flash Sales Strategy', category: 'Marketing', readTime: '5 min' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-2">Seller Resources</h1>
            <p className="text-white/70">Everything you need to succeed on DuukaAfrica</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Guides */}
          <h2 className="text-2xl font-bold mb-6">Downloadable Guides</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {guides.map((guide, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <guide.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{guide.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{guide.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{guide.type}</span>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Videos */}
          <h2 className="text-2xl font-bold mb-6">Video Tutorials</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {videos.map((video, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <Video className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{video.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{video.description}</p>
                  <span className="text-xs text-primary">{video.duration}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Articles */}
          <h2 className="text-2xl font-bold mb-6">Help Center Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {articles.map((article, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{article.category}</span>
                    <span className="text-xs text-gray-500">{article.readTime}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{article.title}</h3>
                  <Button variant="link" className="p-0 h-auto text-primary">
                    Read Article <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Support CTA */}
          <Card className="bg-primary text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Need More Help?</h2>
              <p className="text-white/80 mb-6">Our seller support team is here to help you succeed</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/help">
                  <Button className="bg-white text-primary hover:bg-gray-100">
                    Contact Support
                  </Button>
                </Link>
                <Link href="/seller/register">
                  <Button variant="outline" className="border-white text-white hover:bg-white/10">
                    Start Selling
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
