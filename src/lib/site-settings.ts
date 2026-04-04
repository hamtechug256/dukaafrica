/**
 * Site Settings Utility
 * 
 * Uses the existing `Setting` KV model for all homepage-configurable content.
 * Every hardcoded value on the homepage should have a default here and a
 * corresponding Setting row that the admin can override via the admin panel.
 *
 * Groups:
 *   homepage_contact   – phone, email, whatsapp, address
 *   homepage_social    – facebook, twitter, instagram, youtube
 *   homepage_promo     – promo banner text, link, active
 *   homepage_sections  – visibility/order of homepage sections
 *   homepage_trust     – trust indicator items
 *   homepage_how_it_works – steps configuration (JSON)
 *   homepage_ticker    – live pulse ticker settings
 *   homepage_seller_cta – seller CTA content
 *   homepage_newsletter – newsletter section content
 *   homepage_delivery  – delivery promises
 *   homepage_payment   – payment method badges
 *   homepage_footer    – about text, copyright, countries
 */

import { prisma } from '@/lib/db'

// ─────────────────────────────────────────────────
// Default values (fallback when no DB Setting exists)
// ─────────────────────────────────────────────────

export const DEFAULTS = {
  // Contact
  contact_phone: { value: '+256 700 000000', type: 'STRING', group: 'homepage_contact' },
  contact_email: { value: 'support@duukaafrica.com', type: 'STRING', group: 'homepage_contact' },
  contact_whatsapp: { value: '+256 700 000000', type: 'STRING', group: 'homepage_contact' },
  contact_address: { value: 'Kampala, Uganda', type: 'STRING', group: 'homepage_contact' },

  // Social
  social_facebook: { value: 'https://facebook.com/duukaafrica', type: 'STRING', group: 'homepage_social' },
  social_twitter: { value: 'https://twitter.com/duukaafrica', type: 'STRING', group: 'homepage_social' },
  social_instagram: { value: 'https://instagram.com/duukaafrica', type: 'STRING', group: 'homepage_social' },
  social_youtube: { value: 'https://youtube.com/duukaafrica', type: 'STRING', group: 'homepage_social' },

  // Promo Banner
  promo_banner_text: {
    value: 'Free Delivery in Kampala on orders over USh 100,000!',
    type: 'STRING',
    group: 'homepage_promo',
  },
  promo_banner_link: { value: '/products', type: 'STRING', group: 'homepage_promo' },
  promo_banner_active: { value: 'true', type: 'BOOLEAN', group: 'homepage_promo' },

  // Section visibility
  section_hero_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_trust_bar_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_how_it_works_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_categories_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_featured_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_flash_sales_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_trust_section_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_seller_showcase_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_seller_cta_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },
  section_ticker_visible: { value: 'true', type: 'BOOLEAN', group: 'homepage_sections' },

  // Trust indicators (JSON array)
  trust_indicators: {
    value: JSON.stringify([
      { emoji: '🛡️', text: 'Buyer Protection' },
      { emoji: '✅', text: 'Verified Sellers' },
      { emoji: '💳', text: 'Secure Checkout' },
      { emoji: '🏆', text: 'Dedicated Support' },
    ]),
    type: 'JSON',
    group: 'homepage_trust',
  },

  // How It Works (JSON array of steps)
  how_it_works_steps: {
    value: JSON.stringify([
      {
        icon: 'Search',
        title: 'Browse & Discover',
        description: 'Explore thousands of products from verified sellers across East Africa',
      },
      {
        icon: 'Shield',
        title: 'Pay Safely via Escrow',
        description: 'Your payment is securely held until you receive and confirm your order',
      },
      {
        icon: 'Truck',
        title: 'Fast Delivery to You',
        description: 'Reliable shipping with real-time tracking across Uganda, Kenya, Tanzania & Rwanda',
      },
      {
        icon: 'CheckCircle',
        title: 'Confirm & Seller Gets Paid',
        description: 'Once you are satisfied, the seller receives payment automatically',
      },
    ]),
    type: 'JSON',
    group: 'homepage_how_it_works',
  },
  how_it_works_title: {
    value: 'How DukaAfrica Works',
    type: 'STRING',
    group: 'homepage_how_it_works',
  },
  how_it_works_subtitle: {
    value: 'Simple, safe, and secure shopping in 4 easy steps',
    type: 'STRING',
    group: 'homepage_how_it_works',
  },

  // Live Pulse Ticker
  ticker_enabled: { value: 'true', type: 'BOOLEAN', group: 'homepage_ticker' },
  ticker_template_buy: {
    value: '{name} from {city} just purchased a {product}',
    type: 'STRING',
    group: 'homepage_ticker',
  },
  ticker_template_seller: {
    value: 'A new verified seller from {city} joined today',
    type: 'STRING',
    group: 'homepage_ticker',
  },
  ticker_template_platform: {
    value: '{count} products sold in the last hour',
    type: 'STRING',
    group: 'homepage_ticker',
  },
  ticker_interval_seconds: { value: '5', type: 'NUMBER', group: 'homepage_ticker' },

  // Seller CTA
  seller_cta_badge: {
    value: 'Now accepting sellers across East Africa',
    type: 'STRING',
    group: 'homepage_seller_cta',
  },
  seller_cta_title_1: { value: 'Start Selling on', type: 'STRING', group: 'homepage_seller_cta' },
  seller_cta_title_highlight: { value: 'DuukaAfrica', type: 'STRING', group: 'homepage_seller_cta' },
  seller_cta_description: {
    value: 'Your gateway to millions of buyers across Uganda, Kenya, Tanzania, Rwanda, and beyond.',
    type: 'STRING',
    group: 'homepage_seller_cta',
  },
  seller_cta_benefits: {
    value: JSON.stringify([
      { title: 'Free Store Setup', description: 'Create your online store in minutes at no cost' },
      { title: 'East Africa Reach', description: 'Access customers across Uganda, Kenya, Tanzania & more' },
      { title: 'Secure Payments', description: 'Protected transactions with automatic payouts' },
      { title: 'Low Commission', description: 'Keep more of your profits with competitive rates' },
      { title: 'Analytics Dashboard', description: 'Track sales, views, and grow your business' },
      { title: 'Dedicated Support', description: 'Get help when you need it from our team' },
    ]),
    type: 'JSON',
    group: 'homepage_seller_cta',
  },

  // Newsletter
  newsletter_title: { value: 'Stay Updated with DuukaAfrica', type: 'STRING', group: 'homepage_newsletter' },
  newsletter_subtitle: {
    value: 'Get exclusive deals, new arrivals, and shopping tips delivered to your inbox.',
    type: 'STRING',
    group: 'homepage_newsletter',
  },

  // Delivery promises
  delivery_promise_primary: {
    value: 'Free Delivery in Kampala',
    type: 'STRING',
    group: 'homepage_delivery',
  },
  delivery_promise_condition: {
    value: 'on orders over USh 100,000',
    type: 'STRING',
    group: 'homepage_delivery',
  },

  // Payment method badges
  payment_methods: {
    value: JSON.stringify(['Visa', 'Mastercard', 'MTN MoMo', 'Airtel Money']),
    type: 'JSON',
    group: 'homepage_payment',
  },

  // Footer
  footer_about: {
    value: "East Africa's trusted multi-vendor marketplace. Shop millions of products from verified sellers with buyer protection and fast delivery.",
    type: 'STRING',
    group: 'homepage_footer',
  },
  footer_copyright: { value: 'DuukaAfrica', type: 'STRING', group: 'homepage_footer' },
  footer_countries: {
    value: JSON.stringify([
      { flag: '🇺🇬', name: 'Uganda' },
      { flag: '🇰🇪', name: 'Kenya' },
      { flag: '🇹🇿', name: 'Tanzania' },
      { flag: '🇷🇼', name: 'Rwanda' },
    ]),
    type: 'JSON',
    group: 'homepage_footer',
  },
}

// ─────────────────────────────────────────────────
// Server-side helpers (used in API routes)
// ─────────────────────────────────────────────────

/**
 * Get a single setting value from DB, falling back to DEFAULTS.
 * Safe to call from server components and API routes.
 */
export async function getSetting(key: string): Promise<string> {
  const def = DEFAULTS[key as keyof typeof DEFAULTS]
  if (!def) throw new Error(`Unknown setting key: ${key}`)

  try {
    const row = await prisma.setting.findUnique({ where: { key } })
    return row?.value ?? def.value
  } catch {
    return def.value
  }
}

/**
 * Get multiple settings by group from DB, falling back to DEFAULTS.
 * Returns a Record<key, parsedValue>.
 */
export async function getSettingsByGroup(
  group: string,
  parseJson = true,
): Promise<Record<string, any>> {
  const result: Record<string, any> = {}

  // Find all defaults for this group
  for (const [key, def] of Object.entries(DEFAULTS)) {
    if (def.group === group) {
      try {
        const row = await prisma.setting.findUnique({ where: { key } })
        const raw = row?.value ?? def.value
        if (def.type === 'JSON' && parseJson) {
          result[key] = JSON.parse(raw)
        } else if (def.type === 'BOOLEAN') {
          result[key] = raw === 'true'
        } else if (def.type === 'NUMBER') {
          result[key] = Number(raw)
        } else {
          result[key] = raw
        }
      } catch {
        // If parsing fails, use raw default
        if (def.type === 'JSON' && parseJson) {
          result[key] = JSON.parse(def.value)
        } else {
          result[key] = def.value
        }
      }
    }
  }

  return result
}

/**
 * Get ALL public homepage settings in one call.
 * This is what the public `/api/homepage/settings` endpoint uses.
 * Returns a structured object with all groups.
 */
export async function getAllPublicSettings() {
  const [
    contact,
    social,
    promo,
    sections,
    trust,
    howItWorks,
    ticker,
    sellerCta,
    newsletter,
    delivery,
    payment,
    footer,
  ] = await Promise.all([
    getSettingsByGroup('homepage_contact'),
    getSettingsByGroup('homepage_social'),
    getSettingsByGroup('homepage_promo'),
    getSettingsByGroup('homepage_sections'),
    getSettingsByGroup('homepage_trust'),
    getSettingsByGroup('homepage_how_it_works'),
    getSettingsByGroup('homepage_ticker'),
    getSettingsByGroup('homepage_seller_cta'),
    getSettingsByGroup('homepage_newsletter'),
    getSettingsByGroup('homepage_delivery'),
    getSettingsByGroup('homepage_payment'),
    getSettingsByGroup('homepage_footer'),
  ])

  return {
    contact,
    social,
    promo,
    sections,
    trust,
    howItWorks,
    ticker,
    sellerCta,
    newsletter,
    delivery,
    payment,
    footer,
  }
}

/**
 * Set a single setting (upsert). Used by admin API.
 */
export async function setSetting(key: string, value: string) {
  const def = DEFAULTS[key as keyof typeof DEFAULTS]
  if (!def) throw new Error(`Unknown setting key: ${key}`)

  return prisma.setting.upsert({
    where: { key },
    update: { value, type: def.type, group: def.group },
    create: { key, value, type: def.type, group: def.group },
  })
}

/**
 * Bulk-set settings. Used by admin API.
 * Input: Record<key, value> where values are already strings.
 */
export async function setManySettings(entries: Record<string, string>) {
  const ops = Object.entries(entries).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        type: DEFAULTS[key as keyof typeof DEFAULTS]?.type ?? 'STRING',
        group: DEFAULTS[key as keyof typeof DEFAULTS]?.group ?? 'general',
      },
    }),
  )

  await prisma.$transaction(ops)
}

/**
 * Get the raw Setting rows for a group (admin editing).
 * Returns DB rows with original string values.
 */
export async function getRawSettingsByGroup(group: string) {
  const rows = await prisma.setting.findMany({ where: { group } })

  // Also include defaults that don't have a DB row yet
  const existingKeys = new Set(rows.map((r) => r.key))
  const allKeys = Object.entries(DEFAULTS)
    .filter(([, def]) => def.group === group)
    .map(([key]) => key)

  const merged = allKeys.map((key) => {
    const existing = rows.find((r) => r.key === key)
    const def = DEFAULTS[key as keyof typeof DEFAULTS]
    return existing ?? {
      id: null,
      key,
      value: def.value,
      type: def.type,
      group: def.group,
    }
  })

  return merged
}

/**
 * Get all setting groups and their keys (for admin overview).
 */
export function getAllSettingGroups() {
  const groups: Record<string, { key: string; type: string; defaultValue: string }[]> = {}
  for (const [key, def] of Object.entries(DEFAULTS)) {
    if (!groups[def.group]) groups[def.group] = []
    groups[def.group].push({ key, type: def.type, defaultValue: def.value })
  }
  return groups
}
