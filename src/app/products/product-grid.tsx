'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, ShoppingCart, Star, Store, Check, Loader2 } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { safeParseImages } from '@/lib/helpers'

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
        <h3 className="text-xl font-semibold text-[oklch(0.15_0.02_45)] dark:text-white mb-2">
          No products found
        </h3>
        <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mb-4">
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

  const imagesArray = safeParseImages(product.images)
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
    <Card className="group overflow-hidden rounded-2xl shadow-sm border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] bg-white dark:bg-[oklch(0.15_0.02_45)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-[oklch(0.95_0.01_85)] dark:bg-[oklch(0.18_0.02_45)]">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-[oklch(0.65_0.01_85)]" />
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount > 0 && (
              <Badge className="bg-[oklch(0.6_0.2_35)] text-white">-{discount}%</Badge>
            )}
            {product.quantity === 0 && (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
            {product.quantity > 0 && product.quantity <= 5 && (
              <Badge variant="secondary" className="bg-[oklch(0.75_0.14_80/15%)] text-[oklch(0.55_0.18_80)]">
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
          <Store className="w-3 h-3 text-[oklch(0.65_0.01_85)]" />
          <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] truncate">
            {product.store.name}
          </span>
          {product.store.isVerified && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-100 text-blue-700">
              ✓
            </Badge>
          )}
        </Link>

        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-[oklch(0.15_0.02_45)] dark:text-white line-clamp-2 mb-2 min-h-[2.5rem] hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
            {currency} {product.price.toLocaleString()}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-[oklch(0.65_0.01_85)] line-through">
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
                      : 'text-[oklch(0.88_0.01_85)] dark:text-[oklch(0.35_0.02_45)]'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">({product.reviewCount})</span>
          </div>
        )}

        <Button
          size="sm"
          className="w-full mt-3 bg-gradient-to-r from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] hover:from-[oklch(0.55_0.2_35)] hover:to-[oklch(0.5_0.15_140)] text-white rounded-xl"
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
