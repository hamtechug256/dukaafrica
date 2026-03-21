'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search,
  X,
  Loader2,
  TrendingUp,
  Clock,
  ArrowRight,
  Package,
  Store,
} from 'lucide-react'

interface SearchResult {
  products: Array<{
    id: string
    name: string
    slug: string
    price: number
    currency: string
    image: string
    storeName: string
  }>
  categories: Array<{
    id: string
    name: string
    slug: string
    icon?: string
  }>
  stores: Array<{
    id: string
    name: string
    slug: string
    logo?: string
  }>
  suggestions: string[]
}

interface LiveSearchProps {
  placeholder?: string
  className?: string
  onResultClick?: () => void
}

export function LiveSearch({
  placeholder = 'Search products, stores, categories...',
  className = '',
  onResultClick,
}: LiveSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults(null)
        return
      }

      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const saveSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query.trim()
    if (finalQuery) {
      saveSearch(finalQuery)
      setIsOpen(false)
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`)
      onResultClick?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const clearRecentSearch = (search: string) => {
    const updated = recentSearches.filter((s) => s !== search)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toLocaleString()}`
  }

  const hasResults =
    (results?.products?.length || 0) > 0 ||
    (results?.categories?.length || 0) > 0 ||
    (results?.stores?.length || 0) > 0 ||
    (results?.suggestions?.length || 0) > 0

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults(null)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border rounded-lg shadow-xl z-50 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : query.trim().length < 2 ? (
            // Show recent searches when query is too short
            <div className="p-4">
              {recentSearches.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Recent Searches</span>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search) => (
                      <div
                        key={search}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg group"
                      >
                        <button
                          onClick={() => {
                            setQuery(search)
                            handleSearch(search)
                          }}
                          className="flex-1 text-left"
                        >
                          {search}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            clearRecentSearch(search)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Trending searches */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>Trending</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['iPhone', 'Laptop', 'Headphones', 'Shoes', 'Fashion'].map((trend) => (
                    <button
                      key={trend}
                      onClick={() => {
                        setQuery(trend)
                        handleSearch(trend)
                      }}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {trend}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : hasResults ? (
            <div className="p-4 space-y-4">
              {/* Suggestions */}
              {results?.suggestions && results.suggestions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Suggestions</p>
                  <div className="space-y-1">
                    {results.suggestions.slice(0, 4).map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSearch(suggestion)}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-left"
                      >
                        <Search className="w-4 h-4 text-gray-400" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {results?.products && results.products.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Products</p>
                  <div className="space-y-1">
                    {results.products.slice(0, 4).map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        onClick={() => {
                          saveSearch(query)
                          setIsOpen(false)
                          onResultClick?.()
                        }}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      >
                        <div className="w-10 h-10 relative rounded overflow-hidden bg-gray-100">
                          <Image
                            src={product.image || '/placeholder.png'}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatPrice(product.price, product.currency)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {results?.categories && results.categories.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Categories</p>
                  <div className="space-y-1">
                    {results.categories.slice(0, 3).map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        onClick={() => {
                          saveSearch(query)
                          setIsOpen(false)
                          onResultClick?.()
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      >
                        <Package className="w-4 h-4 text-gray-400" />
                        <span>{category.name}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Stores */}
              {results?.stores && results.stores.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Stores</p>
                  <div className="space-y-1">
                    {results.stores.slice(0, 3).map((store) => (
                      <Link
                        key={store.id}
                        href={`/stores/${store.slug}`}
                        onClick={() => {
                          saveSearch(query)
                          setIsOpen(false)
                          onResultClick?.()
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      >
                        <Store className="w-4 h-4 text-gray-400" />
                        <span>{store.name}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* View All Button */}
              <button
                onClick={() => handleSearch()}
                className="w-full mt-2 py-2 text-center text-sm text-primary hover:underline"
              >
                View all results for "{query}"
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
