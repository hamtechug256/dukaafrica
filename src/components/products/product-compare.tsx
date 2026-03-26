'use client'

import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import Link from 'next/link'
import {
  Scale,
  X,
  Plus,
  Minus,
  Check,
  XCircle,
  Star,
  Package,
  Truck,
  Shield,
  ArrowRight,
} from 'lucide-react'

export interface CompareProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number
  currency: string
  image: string
  storeName: string
  storeSlug: string
  rating: number
  reviewCount: number
  quantity: number
  weight?: number
  shipsToCountries?: string[]
  localShippingOnly: boolean
}

interface CompareState {
  products: CompareProduct[]
  addProduct: (product: CompareProduct) => void
  removeProduct: (productId: string) => void
  clearProducts: () => void
  isInCompare: (productId: string) => boolean
}

const MAX_COMPARE = 3

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      products: [],

      addProduct: (product) => {
        set((state) => {
          if (state.products.length >= MAX_COMPARE) return state
          if (state.products.find((p) => p.id === product.id)) return state
          return { products: [...state.products, product] }
        })
      },

      removeProduct: (productId) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        }))
      },

      clearProducts: () => {
        set({ products: [] })
      },

      isInCompare: (productId) => {
        return get().products.some((p) => p.id === productId)
      },
    }),
    {
      name: 'product-compare',
    }
  )
)

// Compare Button Component for Product Cards
export function CompareButton({ product }: { product: CompareProduct }) {
  const { addProduct, removeProduct, isInCompare, products } = useCompareStore()
  const inCompare = isInCompare(product.id)
  const isFull = products.length >= MAX_COMPARE

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (inCompare) {
      removeProduct(product.id)
    } else if (!isFull) {
      addProduct(product)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={`h-8 w-8 rounded-full ${
        inCompare
          ? 'bg-primary text-primary-foreground'
          : isFull
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      disabled={!inCompare && isFull}
    >
      <Scale className="w-4 h-4" />
    </Button>
  )
}

// Compare Bar (fixed at bottom when products selected)
export function CompareBar() {
  const { products, clearProducts } = useCompareStore()

  if (products.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <span className="font-medium">
            {products.length} product{products.length > 1 ? 's' : ''} selected for comparison
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              <span className="text-sm truncate max-w-[100px]">{product.name}</span>
              <button
                onClick={() => useCompareStore.getState().removeProduct(product.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearProducts}>
            Clear All
          </Button>
          <Link href="/products">
            <Button size="sm">
              Compare Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Full Comparison Page Component
export function ProductComparisonTable() {
  const { products, removeProduct, clearProducts } = useCompareStore()

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Products to Compare</h2>
        <p className="text-gray-500 mb-4">
          Add products to compare by clicking the scale icon on product cards
        </p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    )
  }

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toLocaleString()}`
  }

  const getDiscount = (price: number, comparePrice?: number) => {
    if (!comparePrice || comparePrice <= price) return null
    const discount = Math.round(((comparePrice - price) / comparePrice) * 100)
    return discount
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compare Products</h1>
        <Button variant="outline" onClick={clearProducts}>
          Clear All
        </Button>
      </div>

      {/* Products Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const discount = getDiscount(product.price, product.comparePrice)

          return (
            <Card key={product.id} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={() => removeProduct(product.id)}
              >
                <X className="w-4 h-4" />
              </Button>

              <CardContent className="pt-6">
                {/* Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                  <Image
                    src={product.image || '/placeholder.png'}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {discount && (
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      -{discount}%
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <Link href={`/products/${product.slug}`}>
                  <h3 className="font-semibold hover:text-primary line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                </Link>

                <Link
                  href={`/stores/${product.storeSlug}`}
                  className="text-sm text-gray-500 hover:text-primary"
                >
                  {product.storeName}
                </Link>

                <div className="mt-2">
                  <span className="text-xl font-bold">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  {product.comparePrice && (
                    <span className="text-sm text-gray-400 line-through ml-2">
                      {formatPrice(product.comparePrice, product.currency)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({product.reviewCount} reviews)</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Feature</th>
                  {products.map((p) => (
                    <th key={p.id} className="text-center py-3 px-4 font-medium">
                      {p.name.slice(0, 20)}...
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 px-4 flex items-center gap-2">
                    <span className="font-medium">Price</span>
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="text-center py-3 px-4 font-bold">
                      {formatPrice(p.price, p.currency)}
                      {p.comparePrice && (
                        <span className="block text-xs text-gray-400 line-through">
                          {formatPrice(p.comparePrice, p.currency)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <span className="font-medium">Rating</span>
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{p.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({p.reviewCount})</span>
                      </div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-4">
                    <span className="font-medium">In Stock</span>
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="text-center py-3 px-4">
                      {p.quantity > 0 ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Weight</span>
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="text-center py-3 px-4">
                      {p.weight ? `${p.weight} kg` : 'N/A'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Ships To</span>
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="text-center py-3 px-4">
                      {p.localShippingOnly ? (
                        <Badge variant="outline">Local Only</Badge>
                      ) : (
                        <Badge variant="secondary">All Countries</Badge>
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Seller</span>
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="text-center py-3 px-4">
                      <Link
                        href={`/stores/${p.storeSlug}`}
                        className="text-primary hover:underline"
                      >
                        {p.storeName}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`}>
            <Button className="w-full">View Product</Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
