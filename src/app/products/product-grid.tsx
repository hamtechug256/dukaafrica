'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, ShoppingCart, Star, Store, Check, Loader2 } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string | null
  rating: number
  reviewCount: number
  quantity: number
  currency?: string
  store: {
    id: string
    name: string
    slug: string
    isVerified: boolean
    rating: number
  }
  category?: {
    id: string
    name: string
    slug: string
  } | null
}

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No products found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Try adjusting your filters or search terms
        </p>
        <Link href="/products">
          <Button>Clear Filters</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const [isAdding, setIsAdding] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const { addItem } = useCartStore()
  const { toast } = useToast()

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  const imagesArray = product.images ? JSON.parse(product.images) : []
  const mainImage = imagesArray[0] || null
  const currency = product.currency || 'UGX'

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (product.quantity === 0) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently unavailable.',
        variant: 'destructive',
      })
      return
    }

    setIsAdding(true)

    setTimeout(() => {
      addItem({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.comparePrice,
        quantity: 1,
        image: mainImage,
        storeId: product.store.id,
        storeName: product.store.name,
        maxQuantity: product.quantity,
      })

      setIsAdding(false)
      setIsAdded(true)

      toast({
        title: 'Added to Cart',
        description: `${product.name} has been added to your cart.`,
      })

      setTimeout(() => setIsAdded(false), 2000)
    }, 300)
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600">-{discount}%</Badge>
            )}
            {product.quantity === 0 && (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
            {product.quantity > 0 && product.quantity <= 5 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                Only {product.quantity} left
              </Badge>
            )}
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 hover:bg-white">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Link>

      <CardContent className="p-3">
        <Link 
          href={`/stores/${product.store.slug}`}
          className="flex items-center gap-1 mb-1 hover:text-primary"
        >
          <Store className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {product.store.name}
          </span>
          {product.store.isVerified && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-700">
              ✓
            </Badge>
          )}
        </Link>

        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 min-h-[2.5rem] hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {currency} {product.price.toLocaleString()}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-gray-500 line-through">
              {currency} {product.comparePrice.toLocaleString()}
            </span>
          )}
        </div>

        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.round(product.rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
        )}

        <Button
          size="sm"
          className="w-full mt-3 bg-slate-900 hover:bg-slate-800"
          onClick={handleAddToCart}
          disabled={product.quantity === 0 || isAdding}
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : isAdded ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Added!
            </>
          ) : product.quantity === 0 ? (
            'Out of Stock'
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
