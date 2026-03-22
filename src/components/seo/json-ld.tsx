interface ProductJsonLdProps {
  product: {
    id: string
    name: string
    slug: string
    description?: string | null
    shortDesc?: string | null
    price: number
    comparePrice?: number | null
    images?: string | null
    quantity: number
    rating?: number | null
    reviewCount?: number | null
    createdAt: Date
    Store?: {
      name: string
      slug: string
      rating?: number | null
      reviewCount?: number | null
    } | null
    Category?: {
      name: string
    } | null
    Review?: Array<{
      rating: number
      comment?: string | null
      createdAt: Date
      User?: {
        name: string | null
      } | null
    }>
  }
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const images = product.images ? JSON.parse(product.images) : []
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'
  
  // Calculate aggregate rating
  const reviews = product.Review || []
  const avgRating = product.rating || 
    (reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : null)
  const reviewCount = product.reviewCount || reviews.length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.shortDesc || `Buy ${product.name} on DuukaAfrica`,
    image: images.length > 0 ? images : [`${baseUrl}/logo.svg`],
    url: `${baseUrl}/products/${product.slug}`,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.Store?.name || 'DuukaAfrica Seller',
    },
    ...(avgRating && reviewCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating.toFixed(1),
        reviewCount: reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'UGX',
      availability: product.quantity > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/products/${product.slug}`,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      seller: {
        '@type': 'Organization',
        name: product.Store?.name || 'DuukaAfrica',
      },
    },
    category: product.Category?.name || 'General',
    ...(reviews.length > 0 ? {
      review: reviews.slice(0, 5).map((review) => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1,
        },
        author: {
          '@type': 'Person',
          name: review.User?.name || 'Anonymous',
        },
        reviewBody: review.comment || undefined,
        datePublished: review.createdAt.toISOString().split('T')[0],
      })),
    } : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// Organization JSON-LD for the site
export function OrganizationJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DuukaAfrica',
    url: baseUrl,
    logo: `${baseUrl}/logo.svg`,
    description: 'East Africa\'s trusted multi-vendor marketplace.',
    sameAs: [
      'https://facebook.com/duukaafrica',
      'https://twitter.com/duukaafrica',
      'https://instagram.com/duukaafrica',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+256-700-000000',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Swahili'],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// Website JSON-LD for search
export function WebsiteJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DuukaAfrica',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// BreadcrumbList JSON-Ld
interface BreadcrumbItem {
  name: string
  url: string
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
