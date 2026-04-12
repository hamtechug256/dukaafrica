import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { 
  Package, 
  RotateCcw, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Returns & Refunds - DuukaAfrica',
  description: 'Learn about DuukaAfrica return and refund policy. Easy returns within 7 days for eligible products.',
  openGraph: {
    title: 'Returns & Refunds - DuukaAfrica',
    description: 'Learn about DuukaAfrica return and refund policy. Easy returns within 7 days for eligible products.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Returns & Refunds - DuukaAfrica',
    description: 'Learn about DuukaAfrica return and refund policy. Easy returns within 7 days for eligible products.',
  },
  alternates: {
    canonical: 'https://duukaafrica.com/returns',
  },
}

const returnSteps = [
  {
    step: 1,
    title: 'Initiate Return',
    description: 'Go to your orders, select the item you want to return, and click "Request Return". Provide a reason for the return.',
    icon: Package,
  },
  {
    step: 2,
    title: 'Wait for Approval',
    description: 'The seller will review your request within 24-48 hours. You will be notified once approved.',
    icon: Clock,
  },
  {
    step: 3,
    title: 'Ship the Item',
    description: 'Pack the item securely with all original packaging and tags. Drop it off at the designated location.',
    icon: RotateCcw,
  },
  {
    step: 4,
    title: 'Receive Refund',
    description: 'Once the seller receives and inspects the item, your refund will be processed within 3-5 business days.',
    icon: CheckCircle,
  },
]

const returnReasons = [
  'Item received is defective or damaged',
  'Item does not match description',
  'Wrong item received',
  'Item is missing parts or accessories',
  'Item arrived late (for time-sensitive orders)',
  'Changed my mind (within 7 days, item unused)',
]

const nonReturnableItems = [
  'Perishable goods (food, flowers, plants)',
  'Personalized or custom-made items',
  'Intimate or sanitary goods',
  'Items marked as "Non-returnable" on product page',
  'Gift cards and vouchers',
  'Downloadable software or digital products',
]

export default function ReturnsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">7</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Days to Return</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Money Back</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">3-5</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Days Refund</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">Free</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Return Shipping*</div>
            </CardContent>
          </Card>
        </div>

        {/* How to Return */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              How to Return an Item
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {returnSteps.map((step) => (
                <div key={step.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-3">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Step {step.step}: {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Eligible Reasons */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Eligible Return Reasons
                </h2>
              </div>
              <ul className="space-y-3">
                {returnReasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Non-Returnable Items */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Non-Returnable Items
                </h2>
              </div>
              <ul className="space-y-3">
                {nonReturnableItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Important Notes */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Important Notes
            </h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              <p>
                <strong>• Condition:</strong> Items must be returned in their original condition with all tags and packaging intact.
              </p>
              <p>
                <strong>• Timeframe:</strong> Return requests must be initiated within 7 days of delivery.
              </p>
              <p>
                <strong>• Refund Method:</strong> Refunds are processed to the original payment method used for the purchase.
              </p>
              <p>
                <strong>• Shipping Costs:</strong> Free return shipping is available for defective items or seller errors. For change of mind returns, the buyer covers shipping costs.
              </p>
              <p>
                <strong>• Inspection:</strong> All returned items are inspected upon receipt. If the item is not in resalable condition, a refund may not be issued.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Need help with a return? Contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/orders">
              <Button>
                View Your Orders
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  )
}
