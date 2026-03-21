import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

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
              <Link
                key={category.id}
                href={"/categories/" + category.slug}
                className="group bg-white dark:bg-gray-800 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-green-100 dark:from-orange-900/30 dark:to-green-900/30 rounded-xl flex items-center justify-center text-3xl">
                      {category.icon || '📦'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.productCount.toLocaleString()} products
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
