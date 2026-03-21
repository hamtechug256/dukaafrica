import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CategoryCard } from './category-card'

// Get all categories - using simple count without filtering
async function getCategories() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null,
    },
    orderBy: { name: 'asc' },
  })

  // Get product counts separately
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const count = await prisma.product.count({
        where: {
          categoryId: category.id,
          status: 'ACTIVE',
        },
      })
      return { ...category, productCount: count }
    })
  )

  return categoriesWithCounts
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
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
