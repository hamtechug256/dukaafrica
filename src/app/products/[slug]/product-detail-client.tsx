'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Heart,
  Share2,
  ShoppingCart,
  Star,
  Store,
  MapPin,
  Truck,
  Shield,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  MessageCircle,
  CheckCircle,
  Eye,
  Clock,
  Package,
  RotateCcw,
  Zap,
  Check,
  X,
  ChevronDown,
  Timer,
  Flame,
} from 'lucide-react'
import { ProductGrid } from '../product-grid'
import { WishlistButton } from '@/components/wishlist/wishlist-button'
import { ReviewsSection } from '@/components/reviews/reviews-section'
import { useCartStore } from '@/store/cart-store'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDesc: string | null
  price: number
  comparePrice: number | null
  images: string | null
  quantity: number
  rating: number
  reviewCount: number
  viewCount: number
  purchaseCount: number
  hasVariants: boolean
  variantOptions: string | null
  freeShipping: boolean
  weight: number | null
  store: {
    id: string
    name: string
    slug: string
    logo: string | null
    isVerified: boolean
    rating: number
    reviewCount: number
    city: string | null
    country: string
    totalSales: number
  }
  category: {
    id: string
    name: string
    slug: string
  } | null
  variants: Array<{
    id: string
    name: string
    price: number
    comparePrice: number | null
    quantity: number
    image: string | null
    options: string
    isActive: boolean
  }>
  reviews: Array<{
    id: string
    rating: number
    title: string | null
    comment: string | null
    images: string | null
    isVerified: boolean
    helpfulCount: number
    createdAt: string
    user: {
      name: string | null
      avatar: string | null
    }
  }>
}

interface FlashSale {
  isActive: boolean
  discount: number
  flashSalePrice: number
  originalPrice: number
  comparePrice: number | null
  startDate: string
  endDate: string
  stock: number
  claimed: number
  remaining: number
}

interface ProductDetailClientProps {
  product: Product
  images: string[]
  relatedProducts: any[]
  flashSale: FlashSale | null
}

// Flash Sale Countdown Timer Component
function FlashSaleCountdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime()
      
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [endDate])

  return (
    <div className="flex items-center gap-2">
      <Timer className="w-4 h-4 text-red-500 animate-pulse" />
      <span className="text-sm font-medium">Ends in:</span>
      <div className="flex gap-1">
        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-sm font-bold">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="text-red-500 font-bold">:</span>
        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-sm font-bold">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-red-500 font-bold">:</span>
        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-sm font-bold">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

export function ProductDetailClient({ product, images, relatedProducts, flashSale }: ProductDetailClientProps) {
  const { user } = useUser()
  const { addItem, openCart } = useCartStore()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  // Calculate discount based on whether flash sale is active
  const displayPrice = flashSale ? flashSale.flashSalePrice : product.price
  const displayComparePrice = flashSale ? flashSale.originalPrice : product.comparePrice
  
  const discount = displayComparePrice
    ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
    : 0

  // Stock urgency - use flash sale stock if applicable
  const availableStock = flashSale ? flashSale.remaining : product.quantity
  const isLowStock = availableStock > 0 && availableStock <= 5
  const stockText = availableStock === 0 
    ? 'Out of Stock' 
    : availableStock <= 5 
      ? `Only ${availableStock} left!` 
      : 'In Stock'

  // Handle Add to Cart
  const handleAddToCart = () => {
    const variant = selectedVariant 
      ? product.variants.find(v => v.id === selectedVariant)
      : null

    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: variant?.price ?? displayPrice,
      comparePrice: variant?.comparePrice ?? displayComparePrice,
      quantity: quantity,
      image: images[0] || null,
      storeId: product.store.id,
      storeName: product.store.name,
      variantId: variant?.id,
      variantName: variant?.name,
      maxQuantity: variant?.quantity ?? availableStock,
      sellerCountry: product.store.country,
      weight: product.weight ?? undefined,
    })
    
    // Show success feedback
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  // Handle Share
  const handleShare = async () => {
    const shareUrl = window.location.href
    const shareTitle = product.name
    const shareText = `Check out ${product.name} on DuukaAfrica - UGX ${displayPrice.toLocaleString()}`

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch (err) {
        console.error('Failed to copy')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm overflow-x-auto" aria-label="Breadcrumb">
            <Link href="/" className="text-gray-500 hover:text-orange-500 whitespace-nowrap">Home</Link>
            <ChevronDown className="w-3 h-3 text-gray-400 rotate-[-90deg]" />
            {product.category && (
              <>
                <Link href={`/categories/${product.category.slug}`} className="text-gray-500 hover:text-orange-500 whitespace-nowrap">
                  {product.category.name}
                </Link>
                <ChevronDown className="w-3 h-3 text-gray-400 rotate-[-90deg]" />
              </>
            )}
            <span className="text-gray-900 dark:text-white font-medium truncate">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div 
              className="relative aspect-square bg-white dark:bg-gray-800 rounded-2xl overflow-hidden cursor-zoom-in group"
              onClick={() => setShowLightbox(true)}
            >
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="w-24 h-24 text-gray-300" />
                </div>
              )}

              {/* Discount Badge */}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                  -{discount}% OFF
                </div>
              )}

              {/* Free Shipping Badge */}
              {product.freeShipping && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Free Shipping
                </div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700"
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(Math.max(0, selectedImage - 1)); }}
                    disabled={selectedImage === 0}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700"
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(Math.min(images.length - 1, selectedImage + 1)); }}
                    disabled={selectedImage === images.length - 1}
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* View Full */}
              <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-4 h-4" />
                Click to enlarge
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                      selectedImage === index 
                        ? 'border-orange-500 ring-2 ring-orange-500/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <img src={image} alt={`${product.name} view ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Real Stats - NO FAKE DATA */}
            <div className="flex flex-wrap gap-3 text-sm">
              {product.viewCount > 0 && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full">
                  <Eye className="w-4 h-4 text-orange-500" />
                  <span>{product.viewCount.toLocaleString()} views</span>
                </div>
              )}
              {product.purchaseCount > 0 && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full">
                  <ShoppingCart className="w-4 h-4 text-orange-500" />
                  <span>{product.purchaseCount.toLocaleString()} sold</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-5">
            {/* Store Link */}
            <Link 
              href={`/stores/${product.store.slug}`} 
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span>{product.store.name}</span>
              {product.store.isVerified && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5">
                  <CheckCircle className="w-3 h-3 mr-0.5" />
                  Verified
                </Badge>
              )}
            </Link>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
              {product.name}
            </h1>

            {/* Flash Sale Banner */}
            {flashSale && (
              <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 animate-pulse" />
                    <span className="font-bold text-lg">FLASH SALE</span>
                    <Badge className="bg-white text-red-600 font-bold">
                      -{flashSale.discount}% OFF
                    </Badge>
                  </div>
                  <FlashSaleCountdown endDate={flashSale.endDate} />
                </div>
                <div className="mt-2 text-sm opacity-90">
                  {flashSale.remaining > 0 
                    ? `${flashSale.remaining} items left at this price!`
                    : 'Sold out at this price!'
                  }
                </div>
              </div>
            )}

            {/* Short Description */}
            {product.shortDesc && (
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {product.shortDesc}
              </p>
            )}

            {/* Rating & Stats Row */}
            <div className="flex flex-wrap items-center gap-4">
              {product.rating > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(product.rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{product.rating.toFixed(1)}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">({product.reviewCount} reviews)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <ShoppingCart className="w-4 h-4" />
                <span>{product.purchaseCount.toLocaleString()} sold</span>
              </div>
            </div>

            {/* Price Section */}
            <div className={`rounded-2xl p-5 ${
              flashSale 
                ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-2 border-red-200 dark:border-red-800' 
                : 'bg-gradient-to-r from-orange-50 to-green-50 dark:from-orange-950/20 dark:to-green-950/20'
            }`}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  UGX {displayPrice.toLocaleString()}
                </span>
                {displayComparePrice && displayComparePrice > displayPrice && (
                  <span className="text-xl text-gray-400 line-through">
                    UGX {displayComparePrice.toLocaleString()}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    You save UGX {(displayComparePrice! - displayPrice).toLocaleString()}
                  </span>
                  <Badge className={`${
                    flashSale 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {flashSale ? 'Flash Sale Price' : 'Best Price'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              availableStock === 0 
                ? 'bg-red-50 dark:bg-red-900/20' 
                : isLowStock 
                  ? 'bg-orange-50 dark:bg-orange-900/20' 
                  : 'bg-green-50 dark:bg-green-900/20'
            }`}>
              <Package className={`w-5 h-5 ${
                availableStock === 0 
                  ? 'text-red-500' 
                  : isLowStock 
                    ? 'text-orange-500' 
                    : 'text-green-500'
              }`} />
              <span className={`font-medium ${
                availableStock === 0 
                  ? 'text-red-700 dark:text-red-400' 
                  : isLowStock 
                    ? 'text-orange-700 dark:text-orange-400' 
                    : 'text-green-700 dark:text-green-400'
              }`}>
                {stockText}
              </span>
              {isLowStock && availableStock > 0 && (
                <span className="text-orange-600 dark:text-orange-400 text-sm animate-pulse">
                  Order soon!
                </span>
              )}
            </div>

            {/* Variants */}
            {product.hasVariants && product.variants.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Variant</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      disabled={!variant.isActive || variant.quantity === 0}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedVariant === variant.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                      } ${(!variant.isActive || variant.quantity === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-sm truncate">{variant.name}</div>
                      <div className="text-orange-600 dark:text-orange-400 font-semibold">
                        UGX {variant.price.toLocaleString()}
                      </div>
                      {variant.quantity === 0 && (
                        <div className="text-red-500 text-xs">Out of Stock</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quantity</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-xl transition-colors disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 text-center font-semibold text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                    disabled={quantity >= product.quantity}
                    className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-xl transition-colors disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-gray-600 dark:text-gray-400">
                  of {availableStock} available
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                size="lg" 
                className={`flex-1 h-14 text-lg font-semibold shadow-lg transition-all duration-300 ${
                  addedToCart 
                    ? 'bg-green-500 hover:bg-green-500' 
                    : flashSale 
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600' 
                      : 'bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600'
                }`}
                disabled={availableStock === 0}
                onClick={handleAddToCart}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-6 h-6 mr-2" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-6 h-6 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
              <WishlistButton 
                productId={product.id} 
                variant="outline" 
                size="lg" 
                showText={false}
                className="h-14 w-14"
              />
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 w-14 relative"
                onClick={handleShare}
                aria-label="Share product"
              >
                {shareSuccess ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Share2 className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Trust Features */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Fast Delivery</p>
                  <p className="text-xs text-gray-500">2-5 business days</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Buyer Protection</p>
                  <p className="text-xs text-gray-500">Escrow secured</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Easy Returns</p>
                  <p className="text-xs text-gray-500">7-day return policy</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Quality Checked</p>
                  <p className="text-xs text-gray-500">Verified products</p>
                </div>
              </div>
            </div>

            {/* Store Card */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-4 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {product.store.logo ? (
                      <img src={product.store.logo} alt={product.store.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{product.store.name}</span>
                      {product.store.isVerified && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5">✓ Verified</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {product.store.city || product.store.country}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        {product.store.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/stores/${product.store.slug}`}>
                    <Button variant="outline" size="sm">
                      Visit Store
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" aria-label="Contact seller">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="description" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
              >
                Description
              </TabsTrigger>
              <TabsTrigger 
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
              >
                Reviews ({product.reviewCount})
              </TabsTrigger>
              <TabsTrigger 
                value="shipping"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
              >
                Shipping & Returns
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                {product.description ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{product.description}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No detailed description available.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <ReviewsSection 
                productId={product.id}
                productRating={product.rating}
                reviewCount={product.reviewCount}
                initialReviews={product.reviews}
              />
            </TabsContent>

            <TabsContent value="shipping" className="mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-6">
                {/* Shipping Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-500" />
                    Delivery Information
                  </h3>
                  <div className="space-y-2 text-gray-600 dark:text-gray-400">
                    <p>We deliver to all major cities across East Africa:</p>
                    <ul className="space-y-1 ml-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Kampala, Nairobi, Dar es Salaam: 1-2 business days
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Other major cities: 2-5 business days
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Rural areas: 5-10 business days
                      </li>
                    </ul>
                  </div>
                  {product.freeShipping && (
                    <div className="mt-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-400">Free Shipping!</p>
                        <p className="text-sm text-green-600 dark:text-green-500">This product ships free to your location</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Returns */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-orange-500" />
                    Return Policy
                  </h3>
                  <div className="text-gray-600 dark:text-gray-400 space-y-2">
                    <p>We want you to be completely satisfied with your purchase. If you're not happy, you can return the product within:</p>
                    <ul className="space-y-1 ml-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        7 days for unused items in original packaging
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Full refund if product is damaged or not as described
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Buyer protection through our escrow system
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
            <ProductGrid products={relatedProducts} />
          </div>
        )}
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t p-4 lg:hidden z-50 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              UGX {displayPrice.toLocaleString()}
            </div>
            {displayComparePrice && displayComparePrice > displayPrice && (
              <div className="text-sm text-gray-400 line-through">
                UGX {displayComparePrice.toLocaleString()}
              </div>
            )}
          </div>
          <Button 
            size="lg" 
            className={`transition-all duration-300 ${
              addedToCart 
                ? 'bg-green-500' 
                : flashSale 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                  : 'bg-gradient-to-r from-orange-500 to-green-500'
            }`}
            disabled={availableStock === 0}
            onClick={handleAddToCart}
          >
            {addedToCart ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Added!
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button 
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            onClick={() => setShowLightbox(false)}
            aria-label="Close image preview"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={images[selectedImage]} 
            alt={product.name} 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); setSelectedImage(Math.max(0, selectedImage - 1)); }}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); setSelectedImage(Math.min(images.length - 1, selectedImage + 1)); }}
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Spacer for mobile sticky bar */}
      <div className="h-24 lg:hidden" />
    </div>
  )
}
