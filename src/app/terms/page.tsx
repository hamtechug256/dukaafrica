import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Terms of Service - DuukaAfrica',
  description: 'Read the DuukaAfrica Terms of Service. Understand your rights and obligations as a buyer or seller on East Africa\'s trusted online marketplace.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: March 2024</p>

          <div className="prose prose-gray max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using DuukaAfrica, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>

            <h2>2. Use of Platform</h2>
            <p>DuukaAfrica is a multi-vendor marketplace connecting buyers with sellers across East Africa. You may use our platform to:</p>
            <ul>
              <li>Browse and purchase products from verified sellers</li>
              <li>Register as a seller and list products for sale</li>
              <li>Communicate with other users through our messaging system</li>
              <li>Leave reviews and ratings for products and sellers</li>
            </ul>

            <h2>3. Account Registration</h2>
            <p>To access certain features, you must register for an account. You agree to:</p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be at least 18 years old or have parental consent</li>
            </ul>

            <h2>4. Seller Obligations</h2>
            <p>If you register as a seller, you agree to:</p>
            <ul>
              <li>Sell only authentic, legal products</li>
              <li>Provide accurate product descriptions and images</li>
              <li>Fulfill orders within stated timeframes</li>
              <li>Accept returns in accordance with our return policy</li>
              <li>Pay applicable fees and commissions</li>
            </ul>

            <h2>5. Buyer Protection</h2>
            <p>We offer buyer protection for qualifying purchases. This includes:</p>
            <ul>
              <li>Full refund if product is not received</li>
              <li>Return and refund for significantly misrepresented products</li>
              <li>Secure payment processing through trusted providers</li>
            </ul>

            <h2>6. Prohibited Activities</h2>
            <p>Users may not:</p>
            <ul>
              <li>Sell counterfeit, illegal, or prohibited items</li>
              <li>Engage in fraudulent activities</li>
              <li>Harass or abuse other users</li>
              <li>Manipulate reviews or ratings</li>
              <li>Violate intellectual property rights</li>
            </ul>

            <h2>7. Fees and Payments</h2>
            <p>DuukaAfrica charges a commission on successful sales. Current rates:</p>
            <ul>
              <li>Platform commission: 10% of sale price</li>
              <li>Payment processing fees may apply</li>
              <li>Additional fees for premium features</li>
            </ul>

            <h2>8. Dispute Resolution</h2>
            <p>In case of disputes between buyers and sellers, DuukaAfrica will mediate to reach a fair resolution. Our decisions are final in matters of refunds and returns.</p>

            <h2>9. Limitation of Liability</h2>
            <p>DuukaAfrica is not liable for:</p>
            <ul>
              <li>Actions of individual sellers or buyers</li>
              <li>Delays caused by shipping carriers</li>
              <li>Product quality issues beyond our control</li>
            </ul>

            <h2>10. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of modified terms.</p>

            <h2>Contact Us</h2>
            <p>For questions about these Terms, contact us at legal@duukaafrica.com</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
