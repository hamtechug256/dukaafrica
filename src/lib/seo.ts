import { Metadata } from 'next'

// Site configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'

export const siteConfig = {
  name: 'DuukaAfrica',
  description: 'East Africa\'s Trusted Marketplace. Shop millions of products from verified sellers across East Africa.',
  url: APP_URL,
  ogImage: `${APP_URL}/og-image.jpg`,
  links: {
    twitter: 'https://twitter.com/duukaafrica',
    facebook: 'https://facebook.com/duukaafrica',
    instagram: 'https://instagram.com/duukaafrica',
  },
  creator: 'DuukaAfrica Team',
}

// Default metadata for the site
export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - East Africa's Trusted Marketplace`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'DuukaAfrica',
    'East Africa shopping',
    'online shopping Uganda',
    'online shopping Kenya',
    'online shopping Tanzania',
    'online shopping Rwanda',
    'electronics East Africa',
    'fashion East Africa',
    'marketplace',
    'e-commerce Africa',
    'multi-vendor marketplace',
  ],
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@duukaafrica',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: siteConfig.url,
  },
}

// Generate product metadata
export function generateProductMetadata(product: {
  name: string
  description?: string | null
  slug: string
  images?: string | null
  price: number
  currency: string
}): Metadata {
  const images = product.images ? JSON.parse(product.images) : []
  const imageUrl = images[0] || siteConfig.ogImage

  return {
    title: product.name,
    description: product.description || `Buy ${product.name} at ${product.currency} ${product.price.toLocaleString()} on DuukaAfrica. Quality products from verified sellers.`,
    openGraph: {
      title: `${product.name} - DuukaAfrica`,
      description: product.description || `Buy ${product.name} at ${product.currency} ${product.price.toLocaleString()} on DuukaAfrica.`,
      images: [{ url: imageUrl, width: 800, height: 800 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} - DuukaAfrica`,
      description: product.description || `Buy ${product.name} on DuukaAfrica.`,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${siteConfig.url}/products/${product.slug}`,
    },
  }
}

// Generate category metadata
export function generateCategoryMetadata(category: {
  name: string
  description?: string | null
  slug: string
}): Metadata {
  return {
    title: `${category.name} - Shop Online`,
    description: category.description || `Shop ${category.name} products on DuukaAfrica. Best prices, quality guaranteed, fast delivery across East Africa.`,
    openGraph: {
      title: `${category.name} - DuukaAfrica`,
      description: category.description || `Shop ${category.name} products on DuukaAfrica.`,
    },
    alternates: {
      canonical: `${siteConfig.url}/categories/${category.slug}`,
    },
  }
}

// Generate store metadata
export function generateStoreMetadata(store: {
  name: string
  description?: string | null
  slug: string
}): Metadata {
  return {
    title: `${store.name} - Store`,
    description: store.description || `Shop from ${store.name} on DuukaAfrica. Verified seller with quality products and great prices.`,
    openGraph: {
      title: `${store.name} - DuukaAfrica Store`,
      description: store.description || `Shop from ${store.name} on DuukaAfrica.`,
    },
    alternates: {
      canonical: `${siteConfig.url}/stores/${store.slug}`,
    },
  }
}

// JSON-LD structured data for products
export function generateProductSchema(product: {
  id: string
  name: string
  description?: string | null
  slug: string
  images?: string | null
  price: number
  comparePrice?: number | null
  currency: string
  rating?: number
  reviewCount?: number
  quantity: number
  category?: { name: string } | null
  store: { name: string }
}) {
  const images = product.images ? JSON.parse(product.images) : []

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} - Available on DuukaAfrica`,
    image: images,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: `${siteConfig.url}/products/${product.slug}`,
      priceCurrency: product.currency,
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.store.name,
      },
    },
    aggregateRating: product.reviewCount && product.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 0,
      reviewCount: product.reviewCount,
    } : undefined,
    brand: {
      '@type': 'Brand',
      name: product.store.name,
    },
    category: product.category?.name || 'General',
  }
}

// JSON-LD for organization
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/logo.png`,
  description: siteConfig.description,
  sameAs: [
    siteConfig.links.twitter,
    siteConfig.links.facebook,
    siteConfig.links.instagram,
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+256-700-123-456',
    contactType: 'customer service',
    availableLanguage: ['English', 'Swahili'],
    areaServed: ['UG', 'KE', 'TZ', 'RW'],
  },
}

// JSON-LD for website
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: siteConfig.url,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

// JSON-LD for breadcrumbs
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  }
}
