import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { CategoryCard } from './category-card'
import { JsonLd } from '@/components/json-ld'
import { generateBreadcrumbSchema } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'All Categories - Shop by Category on DuukaAfrica',
  description: 'Browse all product categories on DuukaAfrica. Find electronics, fashion, home & garden, beauty, sports, vehicles, real estate and more across East Africa.',
  openGraph: {
    title: 'All Categories - DuukaAfrica',
    description: 'Browse all product categories on DuukaAfrica. Find electronics, fashion, home & garden, beauty, sports and more.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Categories - DuukaAfrica',
    description: 'Browse all product categories on DuukaAfrica.',
  },
  alternates: {
    canonical: 'https://duukaafrica.com/categories',
  },
}

// Force dynamic rendering - don't try to pre-render at build time
export const dynamic = 'force-dynamic'

// Get all categories - using _count include to avoid N+1 queries
async function getCategories() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null,
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          Product: { where: { status: 'ACTIVE' } },
        },
      },
    },
  })

  return categories.map((category) => ({
    ...category,
    productCount: category._count.Product,
  }))
}

export default async function CategoriesPage() {
  let categories: any[] = []

  try {
    categories = await getCategories()
  } catch (error) {
    console.error('[Categories Page] Failed to fetch categories:', error)
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ])

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <JsonLd data={breadcrumbSchema} />
      <Header />
      
      <main className="flex-1">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Shop by Category
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Browse our wide selection of products across all categories
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
