'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { DynamicIcon, getCategoryEmoji } from '@/components/ui/dynamic-icon'

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
}

interface ProductFiltersProps {
  categories: Category[]
  searchParams: {
    q?: string
    category?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
    page?: string
  }
}

export function ProductFilters({ categories, searchParams }: ProductFiltersProps) {
  const searchParamsObj = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParamsObj.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset to first page when filtering
    return `/products?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={updateFilter('category', category.slug)}
              className={`flex items-center gap-2 text-sm ${
                searchParams.category === category.slug
                  ? 'text-primary font-medium'
                  : 'text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] hover:text-primary'
              }`}
            >
              {category.icon ? (
                <DynamicIcon name={category.icon} className="w-4 h-4" size={16} />
              ) : (
                <span>{getCategoryEmoji(category.slug)}</span>
              )}
              <span>{category.name}</span>
            </Link>
          ))}
          {searchParams.category && (
            <Link
              href="/products"
              className="text-sm text-[oklch(0.6_0.2_35)] hover:text-[oklch(0.55_0.2_35)]"
            >
              Clear category
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Price Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              className="w-full"
              defaultValue={searchParams.minPrice}
            />
            <span className="text-[oklch(0.65_0.01_85)]">-</span>
            <Input
              type="number"
              placeholder="Max"
              className="w-full"
              defaultValue={searchParams.maxPrice}
            />
          </div>
          <Button size="sm" className="w-full mt-3">
            Apply
          </Button>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {['4 & above', '3 & above', '2 & above'].map((rating) => (
            <div key={rating} className="flex items-center gap-2">
              <Checkbox id={rating} />
              <Label htmlFor={rating} className="text-sm text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                {rating} ⭐
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="in-stock" />
            <Label htmlFor="in-stock" className="text-sm text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
              In Stock
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="on-sale" />
            <Label htmlFor="on-sale" className="text-sm text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
              On Sale
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
