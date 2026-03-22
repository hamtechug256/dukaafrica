import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  HelpCircle, 
  Store, 
  Package, 
  CreditCard, 
  Truck, 
  MessageSquare,
  Shield,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react'
import Link from 'next/link'

const faqCategories = [
  {
    icon: <Store className="w-5 h-5" />,
    title: 'Getting Started',
    color: 'bg-blue-100 text-blue-600',
    questions: [
      {
        q: 'How do I create a seller account?',
        a: 'Click "Become a Seller" on the homepage or navigate to /seller/register. You\'ll need to provide your business details, including your store name, contact information, and a brief description of what you sell. After registration, you\'ll go through a quick verification process before you can start listing products.',
      },
      {
        q: 'What documents do I need to verify my store?',
        a: 'For individual sellers, we require a valid government-issued ID. For businesses, you\'ll need business registration documents and a tax identification number. Additional documents may be required for certain product categories like electronics or health products.',
      },
      {
        q: 'How long does verification take?',
        a: 'Most verifications are completed within 24-48 hours. You\'ll receive an email notification once your store is approved. If additional documentation is needed, our team will reach out via email.',
      },
      {
        q: 'Is there a fee to become a seller?',
        a: 'Creating a seller account is completely free. You only pay a commission when you make a sale. Our Starter plan has 10% commission, with lower rates available on Growth (8%) and Enterprise (6%) plans.',
      },
    ],
  },
  {
    icon: <Package className="w-5 h-5" />,
    title: 'Products & Listings',
    color: 'bg-green-100 text-green-600',
    questions: [
      {
        q: 'How do I add a new product?',
        a: 'Go to your Seller Dashboard > Products > Add New Product. Fill in the product details including name, description, price, category, and upload clear images. You can also add product variants (sizes, colors) if applicable. Products start as drafts and can be submitted for review when ready.',
      },
      {
        q: 'What image requirements are there?',
        a: 'Upload high-quality images (at least 800x800 pixels) in JPG, PNG, or WebP format. The first image will be used as the main product photo. You can add up to 10 images per product. Images should show the actual product, not stock photos.',
      },
      {
        q: 'Can I sell digital products?',
        a: 'Currently, DuukaAfrica focuses on physical products. Digital products and services are not supported at this time. We plan to add this feature in the future.',
      },
      {
        q: 'How do I manage inventory?',
        a: 'Your Seller Dashboard has an Inventory section where you can track stock levels, set low-stock alerts, and update quantities. Enable "Track Quantity" on products to automatically reduce stock when orders are placed.',
      },
      {
        q: 'What products are prohibited?',
        a: 'Prohibited items include: counterfeit goods, weapons, drugs, adult content, endangered species products, stolen items, and any illegal items. Selling prohibited items will result in immediate account suspension.',
      },
    ],
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: 'Payments & Earnings',
    color: 'bg-purple-100 text-purple-600',
    questions: [
      {
        q: 'How do I receive payments?',
        a: 'Payments are held in your pending balance until the order is delivered and confirmed. After delivery confirmation, funds move to your available balance within 48 hours. You can then request a withdrawal to your Mobile Money or bank account.',
      },
      {
        q: 'What payment methods do buyers use?',
        a: 'Buyers can pay via Flutterwave (cards, mobile money), Paystack (cards), MTN Mobile Money, M-Pesa, and Airtel Money. All payments are secure and protected.',
      },
      {
        q: 'How are commissions calculated?',
        a: 'Commission is calculated on the product price (excluding shipping). Starter plan: 10%, Growth plan: 8%, Enterprise plan: 6%. Payment processing fees (2.5% + UGX 500) are charged separately by the payment provider.',
      },
      {
        q: 'What is the minimum withdrawal amount?',
        a: 'The minimum withdrawal is UGX 50,000 for Mobile Money and UGX 100,000 for bank transfers. Withdrawals are processed within 1-3 business days.',
      },
      {
        q: 'How do refunds work?',
        a: 'If a buyer requests a refund and it\'s approved, the amount is deducted from your balance. For seller-initiated cancellations, the full amount is refunded to the buyer. See our Refund Policy for detailed scenarios.',
      },
    ],
  },
  {
    icon: <Truck className="w-5 h-5" />,
    title: 'Shipping & Delivery',
    color: 'bg-orange-100 text-orange-600',
    questions: [
      {
        q: 'How does shipping work?',
        a: 'DuukaAfrica uses a bus delivery system for inter-city shipments. When you receive an order, you\'ll send it via a bus company to the buyer\'s city. The buyer picks up at the bus terminal. You\'ll coordinate with the buyer via phone.',
      },
      {
        q: 'Who pays for shipping?',
        a: 'Buyers pay shipping fees at checkout. The shipping amount is calculated based on weight, dimensions, and delivery distance. You receive the shipping amount (minus a 5% platform fee) to cover delivery costs.',
      },
      {
        q: 'How quickly must I ship orders?',
        a: 'Orders should be shipped within 3 business days. Update the order status and provide bus details (company name, number plate, conductor phone) in your dashboard. Delays beyond 3 days may result in order cancellation.',
      },
      {
        q: 'What if a buyer doesn\'t pick up their order?',
        a: 'If a buyer doesn\'t pick up within 7 days, contact our support team. We\'ll attempt to reach the buyer. If unsuccessful, you can recall the package at your expense or arrange alternative delivery.',
      },
      {
        q: 'Can I offer free shipping?',
        a: 'Yes! You can enable "Free Shipping" on individual products. This makes your listing more attractive to buyers. The shipping cost will be covered by you, not the buyer.',
      },
    ],
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Account & Security',
    color: 'bg-red-100 text-red-600',
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page. Enter your registered email and follow the reset link sent to your inbox. For security, the link expires after 24 hours.',
      },
      {
        q: 'Can I have multiple stores?',
        a: 'Each seller account can have one store. If you need to sell in different categories with separate branding, you\'ll need to create separate seller accounts with different email addresses.',
      },
      {
        q: 'What happens if my account is suspended?',
        a: 'Suspensions occur due to policy violations, fraud, or excessive customer complaints. You\'ll receive an email with the reason and appeal process. Contact support if you believe the suspension was in error.',
      },
      {
        q: 'How do I close my seller account?',
        a: 'Go to Seller Dashboard > Settings > Account. Before closing, ensure all orders are fulfilled and withdrawals are complete. Note that account closure is permanent and cannot be undone.',
      },
    ],
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Growing Your Business',
    color: 'bg-teal-100 text-teal-600',
    questions: [
      {
        q: 'How can I increase my sales?',
        a: 'Use high-quality product images, write detailed descriptions, offer competitive prices, respond quickly to customer messages, maintain good ratings, and consider participating in flash sales or promotional events.',
      },
      {
        q: 'How do flash sales work?',
        a: 'Flash sales are time-limited discount events. You can create flash sales from your dashboard with discounted prices and a duration. Products in flash sales get prominent placement and increased visibility.',
      },
      {
        q: 'What is the verified seller badge?',
        a: 'The verified badge shows buyers that your business has been authenticated by DuukaAfrica. It builds trust and can increase sales. Verification is automatic after completing all verification steps and maintaining good standing.',
      },
      {
        q: 'How do I improve my seller rating?',
        a: 'Deliver orders on time, respond to messages within 24 hours, provide accurate product descriptions, and resolve issues professionally. Ask satisfied buyers to leave reviews. Aim for a 4.5+ rating for best visibility.',
      },
    ],
  },
]

export default function SellerFAQPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <HelpCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Seller FAQ</h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Find answers to common questions about selling on DuukaAfrica. 
              Can't find what you're looking for? Contact our support team.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <Link href="/seller/guidelines" className="block">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Seller Guidelines</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/seller/fees" className="block">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Fees & Pricing</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/seller/register" className="block">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Store className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Start Selling</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/help" className="block">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Contact Support</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <section key={categoryIndex}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${category.color}`}>
                    {category.icon}
                  </div>
                  <h2 className="text-xl font-bold">{category.title}</h2>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {category.questions.map((item, qIndex) => (
                        <AccordionItem 
                          key={qIndex} 
                          value={`${categoryIndex}-${qIndex}`}
                          className="border-b last:border-b-0"
                        >
                          <AccordionTrigger className="px-6 py-4 hover:no-underline">
                            <span className="text-left font-medium">{item.q}</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-4 text-gray-600">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>

          {/* Still Need Help */}
          <section className="mt-16">
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Still Need Help?</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Our seller support team is available Monday to Saturday, 
                  9 AM to 6 PM East Africa Time.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button asChild>
                    <Link href="/help">Contact Support</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="mailto:sellers@duukaafrica.com">sellers@duukaafrica.com</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
