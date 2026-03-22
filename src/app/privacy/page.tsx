import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: March 2024</p>

          <div className="prose prose-gray max-w-none">
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly, including:</p>
            <ul>
              <li>Name, email address, phone number</li>
              <li>Delivery and billing addresses</li>
              <li>Payment information (processed securely by third parties)</li>
              <li>Order history and preferences</li>
              <li>Communications with sellers and support</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Process and fulfill your orders</li>
              <li>Communicate about your purchases</li>
              <li>Improve our services and user experience</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Detect and prevent fraud</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>We share information with:</p>
            <ul>
              <li>Sellers to fulfill your orders</li>
              <li>Payment processors for secure transactions</li>
              <li>Shipping carriers for delivery</li>
              <li>Legal authorities when required by law</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We implement industry-standard security measures:</p>
            <ul>
              <li>SSL encryption for data transmission</li>
              <li>Secure data storage with encryption</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>

            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Data portability</li>
            </ul>

            <h2>6. Cookies</h2>
            <p>We use cookies to:</p>
            <ul>
              <li>Remember your preferences</li>
              <li>Analyze site traffic</li>
              <li>Personalize your experience</li>
            </ul>
            <p>See our Cookie Policy for more details.</p>

            <h2>7. Third-Party Links</h2>
            <p>Our platform may contain links to third-party websites. We are not responsible for their privacy practices.</p>

            <h2>8. Children's Privacy</h2>
            <p>Our services are not intended for users under 18. We do not knowingly collect data from children.</p>

            <h2>9. Changes to Policy</h2>
            <p>We may update this policy periodically. Continued use after changes constitutes acceptance.</p>

            <h2>Contact Us</h2>
            <p>For privacy inquiries, contact us at privacy@duukaafrica.com</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
