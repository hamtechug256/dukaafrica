'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  Mail, 
  Phone, 
  MapPin,
  ArrowRight,
  Shield,
  CreditCard,
  Truck,
  Headphones
} from 'lucide-react'

const footerLinks = {
  shop: [
    { name: 'All Categories', href: '/categories' },
    { name: 'Electronics', href: '/categories/electronics' },
    { name: 'Fashion', href: '/categories/fashion' },
    { name: 'Home & Living', href: '/categories/home-living' },
    { name: 'Groceries', href: '/categories/groceries' },
    { name: 'All Products', href: '/products' },
  ],
  sell: [
    { name: 'Start Selling', href: '/seller/register' },
    { name: 'Seller Dashboard', href: '/seller/dashboard' },
    { name: 'Seller Guidelines', href: '/seller/guidelines' },
    { name: 'Seller Resources', href: '/seller/resources' },
    { name: 'Fees & Pricing', href: '/seller/fees' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Track Order', href: '/track-order' },
    { name: 'Returns & Refunds', href: '/returns' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Shipping Info', href: '/shipping' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
}

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/duukaafrica', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com/duukaafrica', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/duukaafrica', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com/duukaafrica', label: 'YouTube' },
]

const paymentMethods = ['Visa', 'Mastercard', 'MTN MoMo', 'Airtel Money', 'PayPal']

export function Footer() {
  return (
    <footer className="bg-[oklch(0.12_0.02_45)] text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3">
                Stay Updated with{' '}
                <span className="text-[oklch(0.75_0.14_80)]">DuukaAfrica</span>
              </h3>
              <p className="text-white/70">
                Get exclusive deals, new arrivals, and shopping tips delivered to your inbox.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-[oklch(0.6_0.2_35)] transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 h-14 rounded-xl font-semibold text-white flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
              >
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <motion.div
                whileHover={{ rotate: 10 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
              >
                <span className="text-white font-bold text-2xl">D</span>
              </motion.div>
              <div>
                <span className="font-bold text-2xl text-white">Duuka</span>
                <span className="font-bold text-2xl text-[oklch(0.55_0.15_140)]">Africa</span>
              </div>
            </Link>
            <p className="text-white/70 mb-6 max-w-sm">
              East Africa&apos;s trusted multi-vendor marketplace. Shop millions of products from verified sellers with buyer protection and fast delivery.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-white/70">
                <MapPin className="w-4 h-4 text-[oklch(0.6_0.2_35)]" />
                <span>Kampala, Uganda</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Phone className="w-4 h-4 text-[oklch(0.6_0.2_35)]" />
                <span>+256 700 000000</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Mail className="w-4 h-4 text-[oklch(0.6_0.2_35)]" />
                <span>support@duukaafrica.com</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-[oklch(0.6_0.2_35)] flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Sell</h4>
            <ul className="space-y-3">
              {footerLinks.sell.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Features Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-t border-b border-white/10 mb-8">
          {[
            { icon: Shield, title: 'Secure Shopping', desc: '100% Protected' },
            { icon: Truck, title: 'Fast Delivery', desc: 'Across East Africa' },
            { icon: CreditCard, title: 'Easy Payment', desc: 'Multiple Options' },
            { icon: Headphones, title: '24/7 Support', desc: 'Always Available' },
          ].map((feature) => (
            <div key={feature.title} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-[oklch(0.6_0.2_35)]" />
              </div>
              <div>
                <div className="font-medium">{feature.title}</div>
                <div className="text-sm text-white/60">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/60 text-sm text-center md:text-left">
            © {new Date().getFullYear()} DuukaAfrica. All rights reserved.
          </div>
          
          {/* Payment Methods */}
          <div className="flex items-center gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white/70"
              >
                {method}
              </div>
            ))}
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-4 text-sm text-white/60">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>

      {/* Countries */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
            <span>Serving:</span>
            <span className="flex items-center gap-1">🇺🇬 Uganda</span>
            <span className="flex items-center gap-1">🇰🇪 Kenya</span>
            <span className="flex items-center gap-1">🇹🇿 Tanzania</span>
            <span className="flex items-center gap-1">🇷🇼 Rwanda</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
