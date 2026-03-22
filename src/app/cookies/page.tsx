import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Cookie } from 'lucide-react'

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Cookie className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Cookie Policy</h1>
              <p className="text-gray-500">Last updated: March 2024</p>
            </div>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">What Are Cookies?</h2>
              <p className="text-gray-600">
                Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.
              </p>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold mb-4">Types of Cookies We Use</h2>
          
          <div className="space-y-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Essential Cookies</h3>
                <p className="text-gray-600 text-sm">
                  Required for the website to function properly. These enable core functionality like security, network management, and accessibility. Cannot be disabled.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Functional Cookies</h3>
                <p className="text-gray-600 text-sm">
                  Remember your preferences like language, region, and login details. Provide enhanced, personalized features.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Analytics Cookies</h3>
                <p className="text-gray-600 text-sm">
                  Help us understand how visitors interact with our website by collecting and reporting information anonymously. Used to improve our website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Marketing Cookies</h3>
                <p className="text-gray-600 text-sm">
                  Track your visit across our website and other sites. Used to display relevant and engaging ads based on your interests.
                </p>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-2xl font-bold mb-4">Managing Cookies</h2>
          <div className="prose prose-gray max-w-none mb-8">
            <p>You can control and manage cookies in various ways:</p>
            <ul>
              <li><strong>Browser Settings:</strong> Most browsers allow you to refuse cookies or delete them</li>
              <li><strong>Cookie Preferences:</strong> Use our cookie consent tool to manage preferences</li>
              <li><strong>Opt-out Tools:</strong> Use third-party opt-out tools like Your Online Choices</li>
            </ul>
            <p>Please note that disabling certain cookies may affect your experience on our website.</p>
          </div>

          <h2 className="text-2xl font-bold mb-4">Third-Party Cookies</h2>
          <p className="text-gray-600 mb-8">
            We use services from trusted third parties that may set cookies, including Google Analytics, payment providers, and social media platforms. Each third party has its own cookie policy.
          </p>

          <Card className="bg-gray-100">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Contact Us</h3>
              <p className="text-gray-600 text-sm mb-4">
                For questions about our use of cookies, contact us at:
              </p>
              <p className="text-sm">Email: privacy@duukaafrica.com</p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
