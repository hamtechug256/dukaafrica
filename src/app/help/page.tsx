import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MessageCircle, Mail, Phone, MapPin, Clock, ChevronRight } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Center - DuukaAfrica | FAQs & Support',
  description: 'Get help with your DuukaAfrica orders, payments, shipping, and account. Find answers to frequently asked questions or contact our support team.',
  openGraph: {
    title: 'Help Center - DuukaAfrica',
    description: 'Find answers to common questions or contact our support team.',
    type: 'website',
  },
}

export default function HelpPage() {
  const faqs = [
    {
      question: 'How do I track my order?',
      answer: 'You can track your order by visiting the "My Orders" section in your dashboard or using the Track Order feature with your order number.',
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept Mobile Money (M-Pesa, MTN MoMo, Airtel Money), credit/debit cards (Visa, Mastercard), and bank transfers.',
    },
    {
      question: 'How do I become a seller?',
      answer: 'Click "Sell on DuukaAfrica" in the header, create your store, and start listing products. It\'s free to get started!',
    },
    {
      question: 'What is the return policy?',
      answer: 'We offer a 7-day return policy for most products. Items must be in original condition with tags attached.',
    },
    {
      question: 'How long does delivery take?',
      answer: 'Delivery times vary by location: Kampala/Nairobi/Dar es Salaam: 1-2 days, Other major cities: 2-5 days, Rural areas: 5-10 days.',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <div className="text-white py-16" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40), oklch(0.55 0.15 140))' }}>  
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-xl text-white/80">Find answers to common questions or contact our support team</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Live Chat</h3>
                <p className="text-gray-600 text-sm mb-4">Chat with our support team in real-time</p>
                <Button variant="outline" className="w-full">Start Chat</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-gray-600 text-sm mb-4">We'll respond within 24 hours</p>
                <Button variant="outline" className="w-full">support@duukaafrica.com</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Phone Support</h3>
                <p className="text-gray-600 text-sm mb-4">Mon-Fri, 8am-6pm EAT</p>
                <Button variant="outline" className="w-full">+256 700 123 456</Button>
              </CardContent>
            </Card>
          </div>

          {/* FAQs */}
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Links */}
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <Link href="/shipping" className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-semibold">Shipping Information</h3>
                <p className="text-sm text-gray-600">Delivery times, costs, and tracking</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link href="/track-order" className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-semibold">Track Your Order</h3>
                <p className="text-sm text-gray-600">Check the status of your order</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
