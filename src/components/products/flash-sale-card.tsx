'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FlashSaleTimer } from './flash-sale-timer'
import { MiniFlashSaleBadge } from './flash-sale-badge'
import { ShoppingCart, Check, Loader2, Heart, Store, Star } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useToast } from '@/hooks/use-toast'

interface FlashSaleProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string | null
  currency?: string
  flashSaleStart: string | Date | null
  flashSaleEnd: string | Date | null
  flashSaleDiscount: number | null
  flashSaleStock: number | null
  flashSaleClaimed: number
  store: {
    id: string
    name: string
    slug: string
    isVerified: boolean
  }
  rating?: number
  reviewCount?: number
}

interface FlashSaleCardProps {
  product: FlashSaleProduct
  showStore?: boolean
  onExpire?: () => void
  compact?: boolean
}

export function FlashSaleCard({ product, showStore = true, onExpire, compact = false }: FlashSaleCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const { addItem } = useCartStore()
  const { toast } = useToast()

  // Parse images
  const imagesArray = product.images ? JSON.parse(product.images) : []
  const mainImage = imagesArray[0] || null
  const currency = product.currency || 'UGX'

  // Calculate flash sale price
  const discount = product.flashSaleDiscount || 0
  const flashSalePrice = product.flashSaleDiscount
    ? Math.round(product.price * (1 - product.flashSaleDiscount / 100))
    : product.price

  // Calculate stock progress
  const totalStock = product.flashSaleStock || 100
  const claimed = product.flashSaleClaimed || 0
  const claimPercentage = Math.round((claimed / totalStock) * 100)
  const remainingStock = totalStock - claimed

  // Get flash sale end time
  const endTime = product.flashSaleEnd || new Date(Date.now() + 24 * 60 * 60 * 1000)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (remainingStock <= 0) {
      toast({
        title: 'Sold Out',
        description: 'This flash sale item is sold out.',
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
        comparePrice: product.price,
        quantity: 1,
        image: mainImage,
        storeId: product.store.id,
        storeName: product.store.name,
        maxQuantity: Math.min(remainingStock, 5), // Limit to 5 per customer
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
        description: `${product.name} has been added to your cart at flash sale price!`,
      })

      setTimeout(() => setIsAdded(false), 2000)
    }, 300)
  }

  // Compact card version
  if (compact) {
    return (
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700">
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

            {/* Flash Sale Badge */}
            {discount > 0 && (
              <MiniFlashSaleBadge discount={discount} />
            )}

            {/* Sold Out Overlay */}
            {remainingStock <= 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-red-500 text-white px-3 py-1 text-sm font-bold rounded">
                  SOLD OUT
                </span>
              </div>
            )}
          </div>
        </Link>

        <CardContent className="p-3">
          {/* Product Name */}
          <Link href={`/products/${product.slug}`}>
            <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-2 hover:text-primary">
              {product.name}
            </h3>
          </Link>

          {/* Timer */}
          <FlashSaleTimer endTime={endTime} variant="compact" />

          {/* Pricing */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-base font-bold text-red-500 dark:text-red-400">
              {currency} {flashSalePrice.toLocaleString()}
            </span>
            {product.price > flashSalePrice && (
              <span className="text-xs text-gray-500 line-through">
                {currency} {product.price.toLocaleString()}
              </span>
            )}
          </div>

          {/* Stock Progress */}
          {product.flashSaleStock && (
            <div className="mb-2">
              <Progress
                value={claimPercentage}
                className="h-1.5 bg-gray-200 dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                {remainingStock > 0 ? `${remainingStock} left` : 'Sold out'}
              </p>
            </div>
          )}

          {/* Add to Cart Button */}
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
            onClick={handleAddToCart}
            disabled={remainingStock <= 0 || isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAdded ? (
              <Check className="h-4 w-4" />
            ) : remainingStock <= 0 ? (
              'Sold Out'
            ) : (
              'Add to Cart'
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Full card version
  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-orange-300 dark:hover:border-orange-700">
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

          {/* Flash Sale Badge */}
          {discount > 0 && (
            <MiniFlashSaleBadge discount={discount} />
          )}

          {/* Sold Out Overlay */}
          {remainingStock <= 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white px-4 py-2 font-bold rounded">
                SOLD OUT
              </span>
            </div>
          )}

          {/* Wishlist Button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 hover:bg-white">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Link>

      <CardContent className="p-4">
        {/* Store Name */}
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
              <span className="text-blue-500 text-xs">✓</span>
            )}
          </Link>
        )}

        {/* Product Name */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 min-h-[2.5rem] hover:text-primary">
            {product.name}
          </h3>
        </Link>

        {/* Countdown Timer */}
        <div className="mb-3">
          <FlashSaleTimer endTime={endTime} variant="compact" />
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-2 flex-wrap mb-3">
          <span className="text-lg font-bold text-red-500 dark:text-red-400">
            {currency} {flashSalePrice.toLocaleString()}
          </span>
          {product.price > flashSalePrice && (
            <span className="text-sm text-gray-500 line-through">
              {currency} {product.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Stock Progress */}
        {product.flashSaleStock && (
          <div className="mb-3">
            <Progress
              value={claimPercentage}
              className="h-2 bg-gray-200 dark:bg-gray-700"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {claimPercentage}% claimed
              </span>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                {remainingStock > 0 ? `${remainingStock} left` : 'Sold out'}
              </span>
            </div>
          </div>
        )}

        {/* Rating */}
        {product.reviewCount && product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.round(product.rating || 0)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
        )}

        {/* Add to Cart Button */}
        <Button
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
          onClick={handleAddToCart}
          disabled={remainingStock <= 0 || isAdding}
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
          ) : remainingStock <= 0 ? (
            'Sold Out'
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

// Grid component for displaying multiple flash sale products
interface FlashSaleGridProps {
  products: FlashSaleProduct[]
  showStore?: boolean
  onExpire?: () => void
  compact?: boolean
}

export function FlashSaleGrid({ products, showStore = true, onExpire, compact = false }: FlashSaleGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">⚡</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No flash sales available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Check back soon for amazing deals!
        </p>
      </div>
    )
  }

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
      {products.map((product) => (
        <FlashSaleCard
          key={product.id}
          product={product}
          showStore={showStore}
          onExpire={onExpire}
          compact={compact}
        />
      ))}
    </div>
  )
}
