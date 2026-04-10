'use client'

import { useState } from 'react'
import { safeParseImages } from '@/lib/helpers'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, ShoppingCart, Star, Store, Check, Loader2, Zap, Clock } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useToast } from '@/hooks/use-toast'
import { MiniFlashSaleBadge } from './flash-sale-badge'
import { FlashSaleTimer } from './flash-sale-timer'
import { WishlistButton } from '@/components/wishlist/wishlist-button'

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
  // Flash sale fields
  isFlashSale?: boolean
  flashSaleStart?: Date | string | null
  flashSaleEnd?: Date | string | null
  flashSaleDiscount?: number | null
  flashSaleStock?: number | null
  flashSaleClaimed?: number
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

interface ProductCardProps {
  product: Product
  showStore?: boolean
}

export function ProductCard({ product, showStore = true }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const { addItem } = useCartStore()
  const { toast } = useToast()

  const imagesArray = safeParseImages(product.images)
  const mainImage = imagesArray[0] || null
  const currency = product.currency || 'UGX'

  // Check if flash sale is active
  const now = new Date()
  const flashSaleStart = product.flashSaleStart ? new Date(product.flashSaleStart) : null
  const flashSaleEnd = product.flashSaleEnd ? new Date(product.flashSaleEnd) : null
  const isFlashSaleActive = 
    product.isFlashSale && 
    flashSaleStart && 
    flashSaleEnd && 
    now >= flashSaleStart && 
    now <= flashSaleEnd

  // Check if flash sale is upcoming
  const isFlashSaleUpcoming = 
    product.isFlashSale && 
    flashSaleStart && 
    flashSaleStart > now

  // Calculate display price
  const flashSaleDiscount = product.flashSaleDiscount || 0
  const flashSalePrice = isFlashSaleActive && flashSaleDiscount > 0
    ? Math.round(product.price * (1 - flashSaleDiscount / 100))
    : product.price

  // Calculate regular discount
  const regularDiscount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  // Calculate flash sale stock
  const flashSaleStock = product.flashSaleStock || 0
  const flashSaleClaimed = product.flashSaleClaimed || 0
  const remainingFlashSaleStock = flashSaleStock - flashSaleClaimed

  // Determine if sold out
  const isSoldOut = isFlashSaleActive 
    ? remainingFlashSaleStock <= 0 
    : product.quantity === 0

  // Determine max quantity for cart
  const maxQuantity = isFlashSaleActive 
    ? Math.min(remainingFlashSaleStock, 5)
    : product.quantity

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isSoldOut) {
      toast({
        title: 'Out of Stock',
        description: isFlashSaleActive 
          ? 'This flash sale item is sold out.'
          : 'This product is currently unavailable.',
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
        price: flashSalePrice,
        comparePrice: isFlashSaleActive ? product.price : product.comparePrice,
        quantity: 1,
        image: mainImage,
        storeId: product.store.id,
        storeName: product.store.name,
        maxQuantity,
        sellerCountry: product.store.country,
        weight: product.weight ?? undefined,
        currency: product.currency,
        freeShipping: !!product.freeShipping,
        localShippingOnly: !!product.localShippingOnly,
        shipsToCountries: product.shipsToCountries ? JSON.parse(String(product.shipsToCountries)) : undefined,
      })

      setIsAdding(false)
      setIsAdded(true)

      toast({
        title: 'Added to Cart',
        description: `${product.name} has been added to your cart${isFlashSaleActive ? ' at flash sale price!' : '.'}`,
      })

      setTimeout(() => setIsAdded(false), 2000)
    }, 300)
  }

  return (
    <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${isFlashSaleActive ? 'border-2 border-orange-300 dark:border-orange-700' : ''}`}>
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {/* Flash Sale Badge */}
            {isFlashSaleActive && flashSaleDiscount > 0 && (
              <MiniFlashSaleBadge discount={flashSaleDiscount} />
            )}
            
            {/* Upcoming Flash Sale Badge */}
            {isFlashSaleUpcoming && (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
                <Clock className="w-3 h-3 mr-1" />
                UPCOMING
              </Badge>
            )}

            {/* Regular Discount Badge (only if not flash sale) */}
            {!isFlashSaleActive && !isFlashSaleUpcoming && regularDiscount > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600">-{regularDiscount}%</Badge>
            )}
            
            {/* Stock Badges */}
            {isSoldOut && (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
            {!isSoldOut && !isFlashSaleActive && product.quantity > 0 && product.quantity <= 5 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                Only {product.quantity} left
              </Badge>
            )}
            {!isSoldOut && isFlashSaleActive && remainingFlashSaleStock > 0 && remainingFlashSaleStock <= 5 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                Only {remainingFlashSaleStock} left
              </Badge>
            )}
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton productId={product.id} variant="outline" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white" />
          </div>

          {/* Sold Out Overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Badge className="bg-red-500 text-white text-lg px-4 py-2">SOLD OUT</Badge>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-3">
        {showStore && (
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
        )}

        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 min-h-[2.5rem] hover:text-primary">
            {product.name}
          </h3>
        </Link>

        {/* Flash Sale Timer */}
        {isFlashSaleActive && flashSaleEnd && (
          <div className="mb-2">
            <FlashSaleTimer endTime={flashSaleEnd} variant="compact" />
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-lg font-bold ${isFlashSaleActive ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {currency} {flashSalePrice.toLocaleString()}
          </span>
          {isFlashSaleActive && flashSalePrice < product.price && (
            <span className="text-sm text-gray-500 line-through">
              {currency} {product.price.toLocaleString()}
            </span>
          )}
          {!isFlashSaleActive && product.comparePrice && (
            <span className="text-sm text-gray-500 line-through">
              {currency} {product.comparePrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Flash Sale Stock Progress */}
        {isFlashSaleActive && product.flashSaleStock && (
          <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
            {remainingFlashSaleStock > 0 
              ? `${remainingFlashSaleStock} left at this price`
              : 'Sold out at sale price'}
          </div>
        )}

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
          className={`w-full mt-3 ${isFlashSaleActive ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}
          onClick={handleAddToCart}
          disabled={isSoldOut || isAdding}
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
          ) : isSoldOut ? (
            'Out of Stock'
          ) : isFlashSaleActive ? (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Add to Cart
            </>
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

// Grid component for displaying multiple products
interface ProductGridProps {
  products: Product[]
  showStore?: boolean
}

export function ProductGrid({ products, showStore = true }: ProductGridProps) {
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
        <ProductCard key={product.id} product={product} showStore={showStore} />
      ))}
    </div>
  )
}
