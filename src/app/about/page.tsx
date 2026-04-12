import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { 
  ShoppingCart, 
  Users, 
  Store, 
  Globe,
  Shield,
  Truck,
  Award,
  Heart
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us - DuukaAfrica',
  description: 'DuukaAfrica is the leading e-commerce marketplace in East Africa. Shop millions of products from verified sellers across the region.',
  openGraph: {
    title: 'About Us - DuukaAfrica',
    description: 'DuukaAfrica is the leading e-commerce marketplace in East Africa. Shop millions of products from verified sellers across the region.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us - DuukaAfrica',
    description: 'DuukaAfrica is the leading e-commerce marketplace in East Africa. Shop millions of products from verified sellers across th',
  },
  alternates: {
    canonical: 'https://duukaafrica.com/about',
  },
}

const stats = [
  { label: 'Products', value: '50K+', icon: ShoppingCart },
  { label: 'Verified Sellers', value: '5K+', icon: Store },
  { label: 'Happy Customers', value: '100K+', icon: Users },
  { label: 'Countries', value: '4', icon: Globe },
]

const values = [
  {
    icon: Shield,
    title: 'Trust & Safety',
    description: 'We verify all sellers and protect buyers with secure payments and buyer protection policies.',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Get your orders delivered quickly across East Africa with our reliable logistics network.',
  },
  {
    icon: Award,
    title: 'Quality Products',
    description: 'We ensure all products meet quality standards before they reach our customers.',
  },
  {
    icon: Heart,
    title: 'Customer First',
    description: 'Your satisfaction is our priority. Our support team is always ready to help.',
  },
]

const countries = [
  { name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  { name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      <main className="flex-1">
      {/* Hero */}
      <div className="text-white" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40), oklch(0.55 0.15 140))' }}>  
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              East Africa's Trusted Marketplace
            </h1>
            <p className="text-xl text-gray-200">
              DuukaAfrica is the leading multi-vendor e-commerce marketplace connecting millions of buyers with verified sellers across East Africa.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="p-6">
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Story */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Our Story
          </h2>
          <div className="prose prose-lg dark:prose-invert mx-auto">
            <p className="text-gray-600 dark:text-gray-400">
              Founded with a vision to revolutionize commerce in East Africa, DuukaAfrica started as a small platform connecting local artisans with buyers. Today, we have grown into the region's most trusted e-commerce marketplace, serving customers across East Africa.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Our name "Duuka" comes from the Swahili word for "shop," reflecting our commitment to making shopping accessible, convenient, and trustworthy for everyone in East Africa.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              We believe that every entrepreneur deserves a platform to showcase their products, and every customer deserves access to quality goods at fair prices. That's why we've built a marketplace that empowers sellers while protecting buyers.
            </p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="bg-white dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Countries */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Serving East Africa
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {countries.map((country) => (
            <Card key={country.name} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="text-4xl mb-2">{country.flag}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {country.name}
                </h3>
                <p className="text-gray-500 text-sm">{country.currency}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="text-white py-16" style={{ background: 'linear-gradient(135deg, oklch(0.55 0.15 140), oklch(0.6 0.2 35))' }}>  
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-xl max-w-2xl mx-auto text-white/90">
            To empower entrepreneurs across East Africa by providing them with a platform to reach millions of customers, while giving buyers access to quality products at competitive prices with exceptional service.
          </p>
        </div>
      </div>

      {/* Seller-First CTA */}
      <div className="text-white py-20" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40), oklch(0.55 0.15 140))' }}>  
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium text-white/90">
                Now accepting sellers across East Africa
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Selling on DuukaAfrica
            </h2>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Your gateway to millions of buyers across Uganda, Kenya, Tanzania, Rwanda, and beyond.
            </p>

            {/* Benefits - Simple Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: '⚡', text: 'Free store setup' },
                { icon: '🌍', text: 'East Africa reach' },
                { icon: '💳', text: 'Secure payments' },
                { icon: '💰', text: 'Low commission' },
                { icon: '📊', text: 'Analytics dashboard' },
                { icon: '🛡️', text: 'Dedicated support' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5">
                  <span>{item.icon}</span>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA - Seller */}
            <Link
              href="/seller/register"
              className="inline-flex items-center gap-3 px-8 py-4 md:px-10 md:py-5 bg-white text-slate-900 rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
            >
              <span>Become a Seller</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                It&apos;s Free
              </span>
            </Link>

            {/* Secondary CTA - Shopper */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-white/60 mb-3">
                Looking to shop instead?
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
              >
                <span>Browse Products</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  )
}
