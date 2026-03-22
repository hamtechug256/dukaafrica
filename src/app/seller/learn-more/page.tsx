import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Store, Truck, CreditCard, Shield, Headphones, TrendingUp, 
  Users, Package, ChevronRight, CheckCircle 
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-r from-slate-900 to-emerald-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Start Selling on DuukaAfrica
                </h1>
                <p className="text-xl text-white/80 mb-8">
                  Join thousands of successful sellers across East Africa. Reach millions of customers with zero listing fees.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/seller/register">
                    <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100">
                      Start Selling Free
                    </Button>
                  </Link>
                  <Link href="/seller/fees">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <div className="text-white/70 text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Sell on DuukaAfrica?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {steps.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* What You Can Sell */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center mb-8">What Can You Sell?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Electronics', 'Fashion', 'Home & Garden', 'Beauty', 'Sports', 'Vehicles', 'Food & Grocery', 'Services'].map((category, index) => (
              <Card key={index} className="hover:bg-gray-50 cursor-pointer">
                <CardContent className="p-4 text-center font-medium">
                  {category}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary to-emerald-600 py-16">
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
            <p className="text-xl text-white/80 mb-8">
              Join DuukaAfrica today and start reaching millions of customers across East Africa.
            </p>
            <Link href="/seller/register">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                Create Your Store <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
