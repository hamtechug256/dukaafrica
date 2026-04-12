import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { StoreProfileClient } from './store-client'
import { JsonLd } from '@/components/json-ld'
import { generateStoreMetadata, generateBreadcrumbSchema } from '@/lib/seo'

interface StorePageProps {
  params: Promise<{ slug: string }>
}

// Generate metadata server-side for SEO
export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  try {
    const { slug } = await params
    const store = await prisma.store.findUnique({
      where: { slug, isActive: true },
      select: {
        name: true,
        description: true,
        slug: true,
        country: true,
        city: true,
        rating: true,
        reviewCount: true,
      },
    })

    if (!store) {
      return { title: 'Store Not Found' }
    }

    return generateStoreMetadata({
      name: store.name,
      description: store.description,
      slug: store.slug,
      country: store.country,
      city: store.city,
      rating: store.rating,
      reviewCount: store.reviewCount,
    })
  } catch (error) {
    console.error('[Store Page] generateMetadata failed:', error)
    return { title: 'Store | DuukaAfrica' }
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params

  // Verify store exists
  const store = await prisma.store.findUnique({
    where: { slug, isActive: true },
    select: { name: true, slug: true },
  })

  if (!store) {
    notFound()
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Stores', url: '/stores' },
    { name: store.name, url: `/stores/${store.slug}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <StoreProfileClient />
    </>
  )
}
