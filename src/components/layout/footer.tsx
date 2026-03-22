'use client'

import Link from "next/link";
import { useState } from "react";
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube,
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle
} from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Failed to subscribe. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      {/* Newsletter */}
      <div className="border-b border-gray-800">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Subscribe to our Newsletter</h3>
              <p className="text-sm text-gray-400">Get the latest deals and offers directly in your inbox</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2 flex-col sm:flex-row">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || status === 'success'}
                  className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary w-full md:w-64 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || status === 'success'}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Subscribing...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Subscribed!</span>
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
              {message && (
                <p className={`text-sm mt-1 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* About */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <div>
                <span className="font-bold text-xl text-white">Duuka</span>
                <span className="font-bold text-xl text-emerald-500">Africa</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              East Africa's Trusted Marketplace. Shop millions of products from verified sellers across East Africa.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-white mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/categories/electronics" className="hover:text-white">Electronics</Link></li>
              <li><Link href="/categories/fashion" className="hover:text-white">Fashion</Link></li>
              <li><Link href="/categories/home-garden" className="hover:text-white">Home & Garden</Link></li>
              <li><Link href="/categories/beauty" className="hover:text-white">Beauty</Link></li>
              <li><Link href="/categories/sports" className="hover:text-white">Sports</Link></li>
              <li><Link href="/categories/vehicles" className="hover:text-white">Vehicles</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold text-white mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              <li><Link href="/track-order" className="hover:text-white">Track Order</Link></li>
              <li><Link href="/returns" className="hover:text-white">Returns & Refunds</Link></li>
              <li><Link href="/shipping" className="hover:text-white">Shipping Info</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>

          {/* Sell on DuukaAfrica */}
          <div>
            <h4 className="font-semibold text-white mb-4">Sell on DuukaAfrica</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/seller" className="hover:text-white">Start Selling</Link></li>
              <li><Link href="/seller/login" className="hover:text-white">Seller Login</Link></li>
              <li><Link href="/seller/guidelines" className="hover:text-white">Seller Guidelines</Link></li>
              <li><Link href="/seller/fees" className="hover:text-white">Fees & Pricing</Link></li>
              <li><Link href="/seller/resources" className="hover:text-white">Seller Resources</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Kampala, Uganda</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+256 700 123 456</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>support@duukaafrica.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-gray-800">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>We accept:</span>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium">M-Pesa</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium">MTN MoMo</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium">Airtel</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium">Visa</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-xs font-medium">Mastercard</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <img src="/logo.svg" alt="Secure" className="h-6 w-auto" />
              <span className="text-gray-500">100% Secure Payments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} DuukaAfrica. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
              <Link href="/cookies" className="hover:text-white">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
