'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation } from '@tanstack/react-query'
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
  Headphones,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'

// ── Settings fetch ──
async function fetchHomepageSettings() {
  const res = await fetch('/api/homepage/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

const SOCIAL_ICON_MAP: Record<string, typeof Facebook> = {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
}

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [subscribeMessage, setSubscribeMessage] = useState('')

  const { data: settingsData } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: fetchHomepageSettings,
    staleTime: 1000 * 60 * 5,
  })

  const settings = settingsData?.settings || {}

  // Admin-configurable values (with hardcoded fallbacks)
  const contact = settings.contact || {}
  const socials = settings.social || {}
  const newsletter = settings.newsletter || {}
  const payment = settings.payment || {}
  const footerConfig = settings.footer || {}

  const phone = contact.contact_phone || '+256 700 000000'
  const email_ = contact.contact_email || 'support@duukaafrica.com'
  const address = contact.contact_address || 'Kampala, Uganda'
  const aboutText =
    footerConfig.footer_about ||
    "East Africa's trusted multi-vendor marketplace. Shop millions of products from verified sellers with buyer protection and fast delivery."
  const copyrightName = footerConfig.footer_copyright || 'DuukaAfrica'
  const paymentMethods = Array.isArray(payment.payment_methods)
    ? payment.payment_methods
    : ['Visa', 'Mastercard', 'MTN MoMo', 'Airtel Money']
  const countries = Array.isArray(footerConfig.footer_countries)
    ? footerConfig.footer_countries
    : [
        { flag: '🇺🇬', name: 'Uganda' },
        { flag: '🇰🇪', name: 'Kenya' },
        { flag: '🇹🇿', name: 'Tanzania' },
        { flag: '🇷🇼', name: 'Rwanda' },
      ]

  const socialLinks = [
    {
      icon: 'Facebook',
      href: socials.social_facebook || 'https://facebook.com/duukaafrica',
      label: 'Facebook',
    },
    {
      icon: 'Twitter',
      href: socials.social_twitter || 'https://twitter.com/duukaafrica',
      label: 'Twitter',
    },
    {
      icon: 'Instagram',
      href: socials.social_instagram || 'https://instagram.com/duukaafrica',
      label: 'Instagram',
    },
    {
      icon: 'Youtube',
      href: socials.social_youtube || 'https://youtube.com/duukaafrica',
      label: 'YouTube',
    },
  ]

  const newsletterTitle = newsletter.newsletter_title || 'Stay Updated with DuukaAfrica'
  const newsletterSubtitle =
    newsletter.newsletter_subtitle ||
    'Get exclusive deals, new arrivals, and shopping tips delivered to your inbox.'

  // Newsletter subscribe handler
  const handleSubscribe = async () => {
    if (!email.trim()) return

    setSubscribeStatus('loading')
    setSubscribeMessage('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setSubscribeStatus('success')
        setSubscribeMessage(data.message || 'Successfully subscribed!')
        setEmail('')
      } else {
        setSubscribeStatus('error')
        setSubscribeMessage(data.error || 'Something went wrong.')
      }
    } catch {
      setSubscribeStatus('error')
      setSubscribeMessage('Network error. Please try again.')
    }

    // Reset status after 4 seconds
    setTimeout(() => {
      setSubscribeStatus('idle')
      setSubscribeMessage('')
    }, 4000)
  }

  const footerLinks = {
    shop: [
      { name: 'All Products', href: '/products' },
      { name: 'All Categories', href: '/categories' },
      { name: 'Electronics', href: '/categories/electronics' },
      { name: 'Fashion', href: '/categories/fashion' },
      { name: 'Home & Garden', href: '/categories/home-garden' },
      { name: 'Beauty', href: '/categories/beauty' },
      { name: 'Sports', href: '/categories/sports' },
      { name: 'Flash Sales', href: '/flash-sales' },
      { name: 'All Stores', href: '/stores' },
    ],
    resources: [
      { name: 'Seller Resources & Downloads', href: '/seller/resources' },
      { name: 'Seller Guidelines', href: '/seller/guidelines' },
      { name: 'Fees & Pricing', href: '/seller/fees' },
      { name: 'Help Center', href: '/help' },
      { name: 'Track Order', href: '/track-order' },
      { name: 'Shipping Info', href: '/shipping' },
      { name: 'Returns & Refunds', href: '/returns' },
      { name: 'About Us', href: '/about' },
      { name: 'Contact Us', href: '/contact' },
    ],
    myAccount: [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'My Orders', href: '/dashboard/orders' },
      { name: 'Wishlist', href: '/dashboard/wishlist' },
      { name: 'My Reviews', href: '/dashboard/reviews' },
      { name: 'Messages', href: '/messages' },
      { name: 'Addresses', href: '/dashboard/addresses' },
      { name: 'Notifications', href: '/dashboard/notifications' },
    ],
    sellOnDuukaAfrica: [
      { name: 'Start Selling', href: '/seller/register' },
      { name: 'Seller Login', href: '/seller/login' },
      { name: 'Seller Dashboard', href: '/seller/dashboard' },
      { name: 'Seller Guidelines', href: '/seller/guidelines' },
      { name: 'Fees & Pricing', href: '/seller/fees' },
      { name: 'Analytics', href: '/seller/analytics' },
      { name: 'Verification', href: '/seller/verification' },
    ],
  }

  return (
    <footer className="bg-[oklch(0.12_0.02_45)] text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3">
                {newsletterTitle.includes('DuukaAfrica') ? (
                  <>
                    {newsletterTitle.replace('DuukaAfrica', '')}{' '}
                    <span className="text-[oklch(0.75_0.14_80)]">DuukaAfrica</span>
                  </>
                ) : (
                  newsletterTitle
                )}
              </h3>
              <p className="text-white/70">{newsletterSubtitle}</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                  placeholder="Enter your email"
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-[oklch(0.6_0.2_35)] transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubscribe}
                disabled={subscribeStatus === 'loading'}
                className="px-8 h-14 rounded-xl font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                style={{
                  background:
                    'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))',
                }}
              >
                {subscribeStatus === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
            {/* Status message */}
            {subscribeMessage && (
              <div className="lg:col-span-2 mt-2">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 text-sm ${
                    subscribeStatus === 'success'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {subscribeStatus === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {subscribeMessage}
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand + Contact */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center mb-6">
              <img
                src="/brand/logo-horizontal-white.png"
                alt="DuukaAfrica"
                className="h-12 w-auto object-contain"
                loading="eager"
              />
            </Link>
            <p className="text-white/70 mb-6 max-w-sm">{aboutText}</p>

            {/* Contact Info - admin configurable */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-white/70">
                <MapPin className="w-4 h-4 text-[oklch(0.6_0.2_35)]" />
                <span>{address}</span>
              </div>
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-[oklch(0.6_0.2_35)]" />
                <span>{phone}</span>
              </a>
              <a
                href={`mailto:${email_}`}
                className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-[oklch(0.6_0.2_35)]" />
                <span>{email_}</span>
              </a>
            </div>

            {/* Social Links - admin configurable */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const IconComponent =
                  SOCIAL_ICON_MAP[social.icon] || Facebook
                return (
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
                    <IconComponent className="w-5 h-5" />
                  </motion.a>
                )
              })}
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* My Account Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">My Account</h4>
            <ul className="space-y-3">
              {footerLinks.myAccount.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell on DuukaAfrica Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Sell on DuukaAfrica</h4>
            <ul className="space-y-3">
              {footerLinks.sellOnDuukaAfrica.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors"
                  >
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

        {/* Payment Methods with real logos */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 text-sm text-white/60">
            <span>We accept:</span>
            <div className="flex items-center gap-3">
              {paymentMethods.map((method: string) => {
                const label = method.toLowerCase()
                const isMoMo = label.includes('mtn') || label.includes('momo')
                const isAirtel = label.includes('airtel')
                const isVisa = label.includes('visa')
                const isMastercard = label.includes('master') || label.includes('mastercard')
                const isAmex = label.includes('american') || label.includes('amex')

                // Real payment logo URLs from Wikimedia Commons & seeklogo
                let logoSrc = ''
                if (isVisa) logoSrc = 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Visa-icon.svg'
                else if (isMastercard) logoSrc = 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg'
                else if (isAmex) logoSrc = 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg'
                else if (isMoMo) logoSrc = 'https://images.seeklogo.com/logo-png/65/1/mtn-momo-icon-logo-png_seeklogo-659243.png'
                else if (isAirtel) logoSrc = 'https://images.seeklogo.com/logo-png/52/1/airtel-money-tanzania-logo-png_seeklogo-527192.png'

                return (
                  <div key={method} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors" title={method}>
                    {logoSrc ? (
                      <Image
                        src={logoSrc}
                        alt={method}
                        width={40}
                        height={26}
                        className="h-5 w-auto object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-white/70 font-medium">{method}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Shield className="w-4 h-4" />
            <span>100% Secure Payments</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/60 text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} {copyrightName}. All rights reserved.
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-4 text-sm text-white/60 flex-wrap justify-center">
            <Link
              href="/terms"
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookies"
              className="hover:text-white transition-colors"
            >
              Cookie Policy
            </Link>
            <Link
              href="/returns"
              className="hover:text-white transition-colors"
            >
              Refund Policy
            </Link>
            <Link
              href="/shipping"
              className="hover:text-white transition-colors"
            >
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Countries - admin configurable */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
            <span>Serving:</span>
            {countries.map(
              (c: { flag: string; name: string }) => (
                <span key={c.name} className="flex items-center gap-1">
                  {c.flag} {c.name}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
