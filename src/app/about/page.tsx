import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-700 text-white">
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
      <div className="bg-gradient-to-r from-primary to-emerald-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-xl max-w-2xl mx-auto text-white/90">
            To empower entrepreneurs across East Africa by providing them with a platform to reach millions of customers, while giving buyers access to quality products at competitive prices with exceptional service.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Start Shopping or Selling?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Join thousands of satisfied customers and successful sellers on DuukaAfrica.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/products"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Start Shopping
            </a>
            <a
              href="/seller"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Become a Seller
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
