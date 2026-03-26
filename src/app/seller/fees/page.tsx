import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, HelpCircle } from 'lucide-react'

export default function SellerFeesPage() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for new sellers',
      features: [
        '10% commission per sale',
        'Basic analytics',
        'Standard support',
        'Up to 50 products',
        'Basic store customization',
      ],
    },
    {
      name: 'Growth',
      price: 'UGX 50,000/mo',
      description: 'For growing businesses',
      popular: true,
      features: [
        '8% commission per sale',
        'Advanced analytics',
        'Priority support',
        'Unlimited products',
        'Custom store branding',
        'Promotional tools',
        'Bulk upload',
      ],
    },
    {
      name: 'Enterprise',
      price: 'UGX 200,000/mo',
      description: 'For large sellers',
      features: [
        '6% commission per sale',
        'Enterprise analytics',
        'Dedicated account manager',
        'Unlimited products',
        'API access',
        'Custom integrations',
        'Premium placement',
        'Marketing support',
      ],
    },
  ]

  const additionalFees = [
    { name: 'Payment Processing', fee: '2.5% + UGX 500', note: 'Charged by payment provider' },
    { name: 'Featured Listing', fee: 'UGX 5,000/week', note: 'Optional promotion' },
    { name: 'Flash Sale Setup', fee: 'Free', note: 'Included in all plans' },
    { name: 'International Sales', fee: '+2% commission', note: 'For cross-border orders' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold mb-4">Seller Fees & Pricing</h1>
            <p className="text-xl text-white/80">Simple, transparent pricing for every business size</p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-2 border-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="text-3xl font-bold mb-6">{plan.price}</div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Fees */}
          <h2 className="text-2xl font-bold mb-6">Additional Fees</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold">Fee Type</th>
                      <th className="text-left p-4 font-semibold">Amount</th>
                      <th className="text-left p-4 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {additionalFees.map((fee, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="p-4 font-medium">{fee.name}</td>
                        <td className="p-4">{fee.fee}</td>
                        <td className="p-4 text-gray-500">{fee.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    When do I get paid?
                  </h3>
                  <p className="text-gray-600">Payments are processed within 48 hours after order delivery confirmation. Funds are transferred to your Mobile Money or bank account.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Is there a setup fee?
                  </h3>
                  <p className="text-gray-600">No! Creating your store is completely free. You only pay commissions on successful sales.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Can I change plans later?
                  </h3>
                  <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
