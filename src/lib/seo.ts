import { Metadata } from 'next'

// Site configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'

export const siteConfig = {
  name: 'DuukaAfrica',
  description: "East Africa's Trusted Marketplace. Shop millions of products from verified sellers across East Africa.",
  url: APP_URL,
  ogImage: `${APP_URL}/og-image.png`,
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
    'Jumia alternative',
    'Jiji alternative',
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
  alternates: {
    canonical: siteConfig.url,
  },
}

// Generate product metadata — now uses metaTitle/metaDesc from DB when available
export function generateProductMetadata(product: {
  name: string
  description?: string | null
  shortDesc?: string | null
  metaTitle?: string | null
  metaDesc?: string | null
  slug: string
  images?: string | null
  price: number
  currency: string
  store?: { name: string } | null
  category?: { name: string } | null
}): Metadata {
  const images = product.images ? JSON.parse(product.images) : []
  const imageUrl = images[0] || siteConfig.ogImage

  const title = product.metaTitle || `${product.name} - Buy Online at Best Price`
  const description = product.metaDesc || product.description || product.shortDesc ||
    `Buy ${product.name} at ${product.currency} ${Number(product.price).toLocaleString()} on DuukaAfrica. ${product.category ? `Shop ${product.category.name} ` : ''}from ${product.store?.name || 'verified sellers'}. Fast delivery across East Africa.`

  return {
    title,
    description,
    keywords: [
      product.name,
      `buy ${product.name} online`,
      `${product.name} ${product.currency}`,
      product.category?.name || '',
      product.store?.name || '',
      'DuukaAfrica',
      'East Africa',
    ].filter(Boolean).join(', '),
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 800, height: 800, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.substring(0, 200),
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
  const title = `${category.name} - Shop ${category.name} Products Online`
  const description = category.description ||
    `Browse the best ${category.name} products on DuukaAfrica. Shop from verified sellers across Uganda, Kenya, Tanzania, and Rwanda with secure payments and fast delivery.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.substring(0, 200),
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
  country?: string | null
  city?: string | null
  rating?: number | null
  reviewCount?: number | null
}): Metadata {
  const location = [store.city, store.country].filter(Boolean).join(', ')
  const title = `${store.name} - Official Store${location ? ` in ${location}` : ''} on DuukaAfrica`
  const description = store.description ||
    `Shop from ${store.name}${location ? ` in ${location}` : ''} on DuukaAfrica. Verified seller with quality products${store.rating ? `, ${store.rating.toFixed(1)} star rating` : ''} and great prices.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.substring(0, 200),
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
  rating?: number | null
  reviewCount?: number | null
  quantity: number
  category?: { name: string } | null
  store: { name: string }
}) {
  const images = product.images ? JSON.parse(product.images) : []
  const cleanSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} - Available on DuukaAfrica`,
    image: images.length > 0 ? images : undefined,
    sku: product.id,
    url: `${siteConfig.url}/products/${product.slug}`,
    offers: {
      '@type': 'Offer',
      url: `${siteConfig.url}/products/${product.slug}`,
      priceCurrency: product.currency,
      price: Number(product.price),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.store.name,
      },
    },
    brand: {
      '@type': 'Brand',
      name: product.store.name,
    },
  }

  // Only add category if it exists
  if (product.category?.name) {
    cleanSchema.category = product.category.name
  }

  // Only add aggregateRating if there are reviews
  if (product.reviewCount && product.reviewCount > 0) {
    cleanSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 0,
      reviewCount: product.reviewCount,
    }
  }

  return cleanSchema
}

// JSON-LD for organization
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/brand/logo-icon.png`,
  description: siteConfig.description,
  sameAs: [
    siteConfig.links.twitter,
    siteConfig.links.facebook,
    siteConfig.links.instagram,
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+256-700-000000',
    contactType: 'customer service',
    availableLanguage: ['English', 'Swahili'],
    areaServed: ['UG', 'KE', 'TZ', 'RW'],
  },
}

// JSON-LD for website with sitelinks search box
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
      item: item.url.startsWith('http') ? item.url : `${siteConfig.url}${item.url}`,
    })),
  }
}

// ─── Blog SEO Helpers ──────────────────────────────────────────────

// Generate metadata for a blog post page
export function generateBlogPostMetadata(post: {
  title: string
  slug: string
  excerpt?: string | null
  metaTitle?: string | null
  metaDesc?: string | null
  coverImage?: string | null
  publishedAt?: string | Date | null
  author?: { name: string | null } | null
  category?: { name: string } | null
}): Metadata {
  const title = post.metaTitle || `${post.title} - DuukaAfrica Blog`
  const description = post.metaDesc || post.excerpt || `Read "${post.title}" on the DuukaAfrica blog. Insights, tips, and updates from East Africa's trusted marketplace.`
  const ogImage = post.coverImage || siteConfig.ogImage

  return {
    title,
    description,
    keywords: [
      post.title,
      post.category?.name || '',
      'DuukaAfrica blog',
      'East Africa marketplace',
    ].filter(Boolean).join(', '),
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
      url: `${siteConfig.url}/blog/${post.slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.substring(0, 200),
      images: [ogImage],
    },
    alternates: {
      canonical: `${siteConfig.url}/blog/${post.slug}`,
    },
  }
}

// Generate Article JSON-LD for a blog post
export function generateBlogPostSchema(post: {
  title: string
  slug: string
  excerpt?: string | null
  coverImage?: string | null
  publishedAt?: string | Date | null
  author?: { name: string | null } | null
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.coverImage || siteConfig.ogImage,
    url: `${siteConfig.url}/blog/${post.slug}`,
    datePublished: post.publishedAt || undefined,
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/brand/logo-icon.png`,
      },
    },
  }
}

// JSON-LD for ItemList (category pages, store product listings)
export function generateItemListSchema(
  name: string,
  description: string,
  url: string,
  items: { name: string; url: string; position: number }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${siteConfig.url}${item.url}`,
    })),
  }
}
