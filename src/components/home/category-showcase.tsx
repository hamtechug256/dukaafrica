'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Loader2, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// Fetch featured categories only
async function fetchFeaturedCategories() {
  const res = await fetch('/api/homepage/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

// Helper to check if image URL is valid
function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url) return false
  if (url.trim() === '') return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Pre-defined gradient styles (inline styles work 100%)
const CATEGORY_GRADIENTS: React.CSSProperties[] = [
  { background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }, // blue to cyan
  { background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }, // pink to rose
  { background: 'linear-gradient(135deg, #f59e0b, #f97316)' }, // amber to orange
  { background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }, // purple to violet
  { background: 'linear-gradient(135deg, #22c55e, #10b981)' }, // green to emerald
  { background: 'linear-gradient(135deg, #84cc16, #22c55e)' }, // lime to green
  { background: 'linear-gradient(135deg, #ef4444, #ec4899)' }, // red to pink
  { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }, // indigo to purple
]

export function CategoryShowcase() {
  // Fetch featured categories
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['homepage-categories'],
    queryFn: fetchFeaturedCategories,
    staleTime: 1000 * 60 * 5,
  })

  const categories = categoriesData?.categories || []
  const hasFeatured = categoriesData?.hasFeatured && categories.length > 0

  // Loading state
  if (isLoading) {
    return (
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        </div>
      </section>
    )
  }

  // No featured categories state - show CTA
  if (!hasFeatured) {
    return (
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-green-500 flex items-center justify-center mx-auto mb-6">
              <Layers className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Categories Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              We're setting up our product categories. Check back soon to explore our curated collections from trusted sellers across East Africa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <button className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-green-500 hover:opacity-90 transition-opacity">
                  Browse All Products
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium mb-4">
              <TrendingUp className="w-4 h-4" />
              Featured Categories
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl">
              Explore our curated collections from sellers across East Africa
            </p>
          </div>
          <div className="hidden md:block mt-4 md:mt-0">
            <Link href="/categories">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-orange-600 dark:text-orange-400 border-2 border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                View All Categories
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Large Card - First Category */}
          {categories[0] && (
            <div className="col-span-2 row-span-2">
              <Link href={`/categories/${categories[0].slug}`}>
                <div className="relative min-h-[400px] md:min-h-[500px] rounded-3xl overflow-hidden group cursor-pointer hover:shadow-2xl transition-shadow">
                  {/* Background - Image or Gradient */}
                  {isValidImageUrl(categories[0].image) ? (
                    <img
                      src={categories[0].image}
                      alt={categories[0].name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div 
                      className="absolute inset-0" 
                      style={CATEGORY_GRADIENTS[0]} 
                    />
                  )}
                  
                  {/* Overlay gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    {categories[0].countText && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        {categories[0].countText}
                      </div>
                    )}
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-orange-300 transition-colors">
                      {categories[0].name}
                    </h3>
                    {categories[0].description && (
                      <p className="text-white/80 text-lg">{categories[0].description}</p>
                    )}
                    
                    {/* Arrow */}
                    <div className="flex items-center gap-2 mt-4 text-white font-semibold group-hover:text-orange-300 transition-colors">
                      <span>Explore</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Medium Cards - Categories 2 & 3 */}
          {categories.slice(1, 3).map((category, index) => (
            <div key={category.id}>
              <Link href={`/categories/${category.slug}`}>
                <div className="relative h-[200px] md:h-[240px] rounded-2xl overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
                  {/* Background - Image or Gradient */}
                  {isValidImageUrl(category.image) ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div 
                      className="absolute inset-0" 
                      style={CATEGORY_GRADIENTS[(index + 1) % CATEGORY_GRADIENTS.length]} 
                    />
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl font-bold text-white mb-1">{category.name}</h3>
                    {category.countText && (
                      <p className="text-white/80 text-sm">{category.countText}</p>
                    )}
                  </div>

                  {/* Hover Icon */}
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              </Link>
            </div>
          ))}

          {/* Small Cards - Categories 4+ */}
          {categories.slice(3).map((category, index) => (
            <div key={category.id}>
              <Link href={`/categories/${category.slug}`}>
                <div className="relative h-[180px] md:h-[200px] rounded-2xl overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
                  {/* Background - Image or Gradient */}
                  {isValidImageUrl(category.image) ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div 
                      className="absolute inset-0" 
                      style={CATEGORY_GRADIENTS[(index + 3) % CATEGORY_GRADIENTS.length]} 
                    />
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">{category.name}</h3>
                    {category.countText && (
                      <p className="text-white/80 text-xs">{category.countText}</p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="md:hidden mt-8 text-center">
          <Link href="/categories">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-green-500 hover:opacity-90 transition-opacity">
              View All Categories
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
