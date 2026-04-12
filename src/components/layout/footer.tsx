import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { getAllPublicSettings } from "@/lib/site-settings";

export async function Footer() {
  let settings: Record<string, any> = {};

  try {
    const data = await getAllPublicSettings();
    settings = data || {};
  } catch {
    // If settings fail, use hardcoded fallbacks below
  }

  const contact = settings.contact || {};
  const socials = settings.social || {};
  const footerConfig = settings.footer || {};
  const payment = settings.payment || {};

  // Admin-configurable contact info (with safe defaults)
  const phone = contact.contact_phone || "+256 700 000000";
  const email_ = contact.contact_email || "support@duukaafrica.com";
  const address = contact.contact_address || "Kampala, Uganda";
  const aboutText =
    footerConfig.footer_about ||
    "East Africa's trusted multi-vendor marketplace. Shop millions of products from verified sellers across East Africa.";
  const copyrightName = footerConfig.footer_copyright || "DuukaAfrica";

  // Admin-configurable social links (with safe defaults)
  const socialLinks = [
    {
      icon: Facebook,
      href: socials.social_facebook || "https://facebook.com/duukaafrica",
      label: "Facebook",
    },
    {
      icon: Twitter,
      href: socials.social_twitter || "https://twitter.com/duukaafrica",
      label: "Twitter",
    },
    {
      icon: Instagram,
      href: socials.social_instagram || "https://instagram.com/duukaafrica",
      label: "Instagram",
    },
    {
      icon: Youtube,
      href: socials.social_youtube || "https://youtube.com/duukaafrica",
      label: "YouTube",
    },
  ];

  // Admin-configurable payment methods (with safe defaults)
  const paymentMethods: string[] = Array.isArray(payment.payment_methods)
    ? payment.payment_methods
    : ["MTN MoMo", "Airtel Money", "Visa", "Mastercard"];

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      {/* Newsletter */}
      <div className="border-b border-gray-800">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Subscribe to our Newsletter
              </h3>
              <p className="text-sm text-gray-400">
                Get the latest deals and offers directly in your inbox
              </p>
            </div>
            <form
              className="flex w-full md:w-auto gap-2"
              action="/api/newsletter"
              method="POST"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="Enter your email"
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary w-full md:w-64"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* About */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <img src="/brand/logo-horizontal-white.png" alt="DuukaAfrica" className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-sm text-gray-400 mb-4">{aboutText}</p>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors"
                    aria-label={social.label}
                  >
                    <IconComponent className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-white mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white">All Products</Link></li>
              <li><Link href="/categories" className="hover:text-white">All Categories</Link></li>
              <li><Link href="/categories/electronics" className="hover:text-white">Electronics</Link></li>
              <li><Link href="/categories/fashion" className="hover:text-white">Fashion</Link></li>
              <li><Link href="/categories/home-garden" className="hover:text-white">Home &amp; Garden</Link></li>
              <li><Link href="/categories/beauty" className="hover:text-white">Beauty</Link></li>
              <li><Link href="/categories/sports" className="hover:text-white">Sports</Link></li>
              <li><Link href="/flash-sales" className="hover:text-white">Flash Sales</Link></li>
              <li><Link href="/stores" className="hover:text-white">All Stores</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/seller/resources" className="hover:text-white">Seller Resources &amp; Downloads</Link></li>
              <li><Link href="/seller/guidelines" className="hover:text-white">Seller Guidelines</Link></li>
              <li><Link href="/seller/fees" className="hover:text-white">Fees &amp; Pricing</Link></li>
              <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              <li><Link href="/track-order" className="hover:text-white">Track Order</Link></li>
              <li><Link href="/shipping" className="hover:text-white">Shipping Info</Link></li>
              <li><Link href="/returns" className="hover:text-white">Returns &amp; Refunds</Link></li>
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>

          {/* My Account */}
          <div>
            <h4 className="font-semibold text-white mb-4">My Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
              <li><Link href="/dashboard/orders" className="hover:text-white">My Orders</Link></li>
              <li><Link href="/dashboard/wishlist" className="hover:text-white">Wishlist</Link></li>
              <li><Link href="/dashboard/reviews" className="hover:text-white">My Reviews</Link></li>
              <li><Link href="/messages" className="hover:text-white">Messages</Link></li>
              <li><Link href="/dashboard/addresses" className="hover:text-white">Addresses</Link></li>
              <li><Link href="/dashboard/notifications" className="hover:text-white">Notifications</Link></li>
            </ul>
          </div>

          {/* Sell on DuukaAfrica */}
          <div>
            <h4 className="font-semibold text-white mb-4">Sell on DuukaAfrica</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/seller/register" className="hover:text-white">Start Selling</Link></li>
              <li><Link href="/seller/login" className="hover:text-white">Seller Login</Link></li>
              <li><Link href="/seller/dashboard" className="hover:text-white">Seller Dashboard</Link></li>
              <li><Link href="/seller/guidelines" className="hover:text-white">Seller Guidelines</Link></li>
              <li><Link href="/seller/fees" className="hover:text-white">Fees &amp; Pricing</Link></li>
              <li><Link href="/seller/analytics" className="hover:text-white">Analytics</Link></li>
              <li><Link href="/seller/verification" className="hover:text-white">Verification</Link></li>
            </ul>
          </div>

          {/* Contact — admin-configurable */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{email_}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Methods — admin-configurable */}
      <div className="border-t border-gray-800">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-400">
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
                    <div key={method} className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded" title={method}>
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
                        <span className="text-xs text-gray-400 font-medium">{method}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <img
                src="/brand/logo-icon.png"
                alt="Secure"
                width={24}
                height={24}
                className="h-6 w-auto"
              />
              <span className="text-gray-500">100% Secure Payments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} {copyrightName}. All rights
              reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-white">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="hover:text-white">
                Cookie Policy
              </Link>
              <Link href="/returns" className="hover:text-white">
                Refund Policy
              </Link>
              <Link href="/shipping" className="hover:text-white">
                Shipping Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
