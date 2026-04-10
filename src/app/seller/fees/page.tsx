'use client'

import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  HelpCircle,
  Shield,
  Zap,
  TrendingUp,
  Star,
  Upload,
  BarChart3,
  Store,
  Clock,
  ArrowRight,
  CreditCard,
  Truck,
} from 'lucide-react'
import { formatPrice } from '@/lib/currency'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
}

export default function SellerFeesPage() {
  const tiers = [
    {
      name: 'Starter',
      commission: '15%',
      escrowHold: '7 days',
      maxProducts: '10',
      maxTransactionAmount: 500000,
      description: 'Perfect for new sellers getting started',
      requirements: 'Just sign up — no verification needed',
      popular: false,
      features: [
        'Up to 10 product listings',
        'Basic seller dashboard',
        'Standard customer support',
        'Order management tools',
        'Mobile Money payouts',
        'Email notifications',
      ],
      notIncluded: [
        'Bulk product upload',
        'Analytics dashboard',
        'Custom store branding',
        'Flash Sales access',
      ],
    },
    {
      name: 'Verified',
      commission: '10%',
      escrowHold: '5 days',
      maxProducts: 'Unlimited',
      maxTransactionAmount: 2000000,
      description: 'For serious sellers ready to grow',
      requirements: 'ID verification + selfie verification',
      popular: true,
      features: [
        'Unlimited product listings',
        'Full analytics dashboard',
        'Priority customer support',
        'Bulk product upload',
        'Custom store branding',
        'Flash Sales access',
        'Advanced order management',
        'Seller performance metrics',
      ],
      notIncluded: [
        'Featured store placement',
      ],
    },
    {
      name: 'Premium',
      commission: '8%',
      escrowHold: '3 days',
      maxProducts: 'Unlimited',
      maxTransactionAmount: 5000000,
      description: 'For established businesses at scale',
      requirements: 'Business docs + tax docs + physical location',
      popular: false,
      features: [
        'Everything in Verified, plus:',
        'Lowest commission rate (8%)',
        'Fastest payouts (3 days)',
        'Highest transaction limits',
        'Featured store placement',
        'Dedicated account support',
        'Promotional priority',
        'Custom analytics reports',
      ],
      notIncluded: [],
    },
  ]

  const upgradeSteps = [
    {
      from: 'Starter',
      to: 'Verified',
      requirements: [
        'Upload a valid government-issued ID (National ID, Passport, or Driver\'s License)',
        'Take and submit a live selfie photo for identity verification',
        'Verification is typically completed within 24-48 hours',
      ],
    },
    {
      from: 'Verified',
      to: 'Premium',
      requirements: [
        'Provide business registration documents (Certificate of Incorporation, etc.)',
        'Submit tax registration documents (TIN certificate)',
        'Verify a physical business location (store, warehouse, or office)',
      ],
    },
  ]

  const additionalFees = [
    {
      name: 'Payment Processing',
      fee: 'Varies by provider',
      note: 'Charged by the payment provider (Pesapal 3.5%) — not by DuukaAfrica',
      icon: CreditCard,
    },
    {
      name: 'Shipping Costs',
      fee: 'Seller bears cost',
      note: 'Sellers cover shipping costs. You can add shipping fees to product prices or charge at checkout.',
      icon: Truck,
    },
    {
      name: 'Featured Listing',
      fee: 'Coming Soon',
      note: 'Premium placement in search results and category pages — optional promotion',
      icon: Star,
    },
    {
      name: 'Flash Sales',
      fee: 'Free (Verified & Premium)',
      note: 'Create time-limited flash sales to boost sales. Available for Verified and Premium sellers.',
      icon: Zap,
    },
  ]

  const faqs = [
    {
      question: 'Is it free to start selling on DuukaAfrica?',
      answer: 'Yes! There are NO monthly fees, setup fees, or hidden charges. You only pay a commission when you make a sale. As a Starter tier seller, the commission is 15% per sale. You can upgrade to lower your commission rate.',
    },
    {
      question: 'How does the escrow system work?',
      answer: 'When a buyer pays for an order, the funds are held in escrow to protect both parties. The hold period depends on your seller tier: Starter (7 days), Verified (5 days), or Premium (3 days). After the hold period and buyer confirmation, the funds (minus commission) are released to your account.',
    },
    {
      question: 'When and how do I receive payouts?',
      answer: 'After the escrow hold period ends and the buyer confirms delivery (or the auto-confirmation period passes), your payout is processed to your registered Mobile Money number or bank account. Higher-tier sellers get paid faster — Premium sellers receive payouts in just 3 days.',
    },
    {
      question: 'How do I upgrade my seller tier?',
      answer: 'Upgrading is simple: Starter → Verified requires ID verification and a selfie. Verified → Premium requires business registration documents, tax documents, and a verified physical location. Navigate to Settings > Verification in your seller dashboard to start the upgrade process.',
    },
    {
      question: 'What happens to my commission rate if I downgrade?',
      answer: 'If you voluntarily downgrade or fail to maintain your verification status, your tier will be adjusted accordingly and the applicable commission rate for that tier will apply to future sales. Existing orders in progress will not be affected.',
    },
    {
      question: 'Are there any limits on what I can sell?',
      answer: 'Starter sellers can list up to 10 products. Verified and Premium sellers can list unlimited products. However, all sellers must follow our Seller Guidelines — counterfeit goods, prohibited items, and misleading listings are not allowed and will result in account suspension.',
    },
    {
      question: 'Do I need to pay for shipping labels or packaging?',
      answer: 'No, DuukaAfrica does not charge for shipping labels. However, as a seller, you are responsible for packaging and shipping costs. You can factor these into your product pricing or charge a separate shipping fee at checkout.',
    },
  ]

  const featureComparison = [
    { feature: 'Flash Sales', starter: false, verified: true, premium: true },
    { feature: 'Bulk Product Upload', starter: false, verified: true, premium: true },
    { feature: 'Analytics Dashboard', starter: false, verified: true, premium: true },
    { feature: 'Custom Store Branding', starter: false, verified: true, premium: true },
    { feature: 'Featured Store Placement', starter: false, verified: false, premium: true },
    { feature: 'Promotional Priority', starter: false, verified: false, premium: true },
    { feature: 'Dedicated Account Support', starter: false, verified: false, premium: true },
    { feature: 'Max Products', starter: '10', verified: 'Unlimited', premium: 'Unlimited' },
    { feature: 'Commission Rate', starter: '15%', verified: '10%', premium: '8%' },
    { feature: 'Escrow Hold', starter: '7 days', verified: '5 days', premium: '3 days' },
    { feature: 'Max Transaction', starter: '500K', verified: '2M', premium: '5M' },
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <motion.div {...fadeIn}>
              <Badge className="mb-4 bg-white/20 text-white border-0 hover:bg-white/30">
                100% Free to Start — No Monthly Fees
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Seller Fees & Pricing
              </h1>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Simple, transparent commission-based pricing. You only pay when you sell.
                Upgrade your tier to unlock lower rates and more features.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Free to Start Banner */}
          <motion.div
            className="mb-16 p-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
            {...fadeIn}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    Free to Start — No Subscription Required
                  </h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    No monthly fees, no setup fees, no hidden charges. Commission only on successful sales.
                  </p>
                </div>
              </div>
              <Link href="/seller/register">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Tier Cards */}
          <motion.div
            className="grid md:grid-cols-3 gap-6 mb-16"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {tiers.map((tier, index) => (
              <motion.div key={index} variants={fadeIn}>
                <Card
                  className={`relative h-full ${
                    tier.popular
                      ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-100 dark:shadow-emerald-950/30'
                      : 'border'
                  }`}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white">
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {tier.description}
                    </p>

                    <div className="mb-6">
                      <span className="text-4xl font-bold">{tier.commission}</span>
                      <span className="text-gray-500 ml-1">commission</span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>Escrow hold: <strong>{tier.escrowHold}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Upload className="w-4 h-4 text-gray-500" />
                        <span>Max products: <strong>{tier.maxProducts}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span>Max transaction: <strong>{formatPrice(tier.maxTransactionAmount, 'UGX')}</strong></span>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        REQUIREMENTS
                      </p>
                      <p className="text-sm font-medium">{tier.requirements}</p>
                    </div>

                    <h4 className="font-semibold text-sm mb-3">What&apos;s included:</h4>
                    <ul className="space-y-2 mb-6">
                      {tier.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {tier.notIncluded.length > 0 && (
                      <>
                        <h4 className="font-semibold text-sm mb-2 text-gray-400">
                          Not included:
                        </h4>
                        <ul className="space-y-2">
                          {tier.notIncluded.map((feature, fIndex) => (
                            <li
                              key={fIndex}
                              className="flex items-start gap-2 text-sm text-gray-400"
                            >
                              <span className="w-4 h-4 shrink-0 mt-0.5 text-gray-300 text-center">
                                —
                              </span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <Link href="/seller/register" className="block mt-6">
                      <Button
                        className={`w-full ${
                          tier.popular
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : ''
                        }`}
                        variant={tier.popular ? 'default' : 'outline'}
                      >
                        Get Started Free
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature Comparison Table */}
          <motion.div className="mb-16" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">Feature Comparison</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-800">
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold">Starter</th>
                        <th className="text-center p-4 font-semibold bg-emerald-50 dark:bg-emerald-950/20">
                          Verified
                        </th>
                        <th className="text-center p-4 font-semibold">Premium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureComparison.map((row, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-4 font-medium">{row.feature}</td>
                          <td className="p-4 text-center">
                            {typeof row.starter === 'boolean' ? (
                              row.starter ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
                            ) : (
                              <span className="font-medium">{row.starter}</span>
                            )}
                          </td>
                          <td className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-950/10">
                            {typeof row.verified === 'boolean' ? (
                              row.verified ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
                            ) : (
                              <span className="font-medium">{row.verified}</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {typeof row.premium === 'boolean' ? (
                              row.premium ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
                            ) : (
                              <span className="font-medium">{row.premium}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* How Escrow Works */}
          <motion.div className="mb-16" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">How Escrow & Payouts Work</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Payment Held in Escrow</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    When a buyer pays, funds are securely held in escrow. This protects both buyer and seller.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Order Delivered</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You ship the product and the buyer confirms delivery (or auto-confirmation after the escrow period).
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold mb-2">3. You Get Paid</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    After the escrow hold period, the sale amount minus commission is transferred to your Mobile Money or bank account.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* How to Upgrade */}
          <motion.div className="mb-16" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">How to Upgrade Your Tier</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {upgradeSteps.map((step, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-bold">
                          {step.from} → {step.to}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Upgrade to unlock better rates & features
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {step.requirements.map((req, rIndex) => (
                        <li key={rIndex} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 dark:text-gray-400">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Additional Fees */}
          <motion.div className="mb-16" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">Additional Fees & Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {additionalFees.map((fee, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <fee.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{fee.name}</h3>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                          {fee.fee}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {fee.note}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div className="mb-16" {...fadeIn}>
            <h2 className="text-2xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 flex items-start gap-2">
                      <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 ml-7">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Final CTA */}
          <motion.div
            className="text-center py-12 rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40), oklch(0.55 0.15 140))',
            }}
            {...fadeIn}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Selling?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of sellers on DuukaAfrica. It&apos;s completely free to start
              — no monthly fees, no setup costs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/seller/register">
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 font-semibold"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/seller/guidelines">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white/10"
                >
                  Read Seller Guidelines
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
