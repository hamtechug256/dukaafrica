'use client'

import Link from 'next/link'
import { DynamicIcon, getCategoryEmoji } from '@/components/ui/dynamic-icon'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  icon: string | null
  productCount: number
}

interface CategoryCardProps {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group bg-white dark:bg-gray-800 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-4">
        {category.image ? (
          <img 
            src={category.image} 
            alt={category.name} 
            className="w-16 h-16 rounded-xl object-cover" 
          />
        ) : category.icon ? (
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-green-100 dark:from-orange-900/30 dark:to-green-900/30 rounded-xl flex items-center justify-center">
            <DynamicIcon 
              name={category.icon} 
              className="w-8 h-8 text-orange-600 dark:text-orange-400" 
              size={32}
            />
          </div>
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-green-100 dark:from-orange-900/30 dark:to-green-900/30 rounded-xl flex items-center justify-center text-3xl">
            {getCategoryEmoji(category.slug)}
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
  )
}
