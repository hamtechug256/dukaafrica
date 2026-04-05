'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, SlidersHorizontal, X } from 'lucide-react'

interface CategoryFiltersClientProps {
  categorySlug: string
  currentSort: string
  currentSearch: string
  totalProducts: number
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
]

export function CategoryFiltersClient({ categorySlug, currentSort, currentSearch, totalProducts }: CategoryFiltersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    // Reset page when filters change
    params.delete('page')

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }

    const queryString = params.toString()
    router.push(`/categories/${categorySlug}${queryString ? `?${queryString}` : ''}`)
  }, [categorySlug, router, searchParams])

  const handleSearch = (value: string) => {
    updateParams({ search: value })
  }

  const handleSort = (value: string) => {
    updateParams({ sort: value })
  }

  const clearFilters = () => {
    router.push(`/categories/${categorySlug}`)
  }

  const hasActiveFilters = currentSort !== 'newest' || currentSearch !== ''

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''}
          </span>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
            <X className="w-3 h-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search in this category..."
            defaultValue={currentSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch((e.target as HTMLInputElement).value)
              }
            }}
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <div className="flex gap-2 flex-wrap">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={currentSort === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort(option.value)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
