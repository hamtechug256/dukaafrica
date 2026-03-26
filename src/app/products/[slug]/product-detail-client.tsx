'use client'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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
  ThumbsUp,
} from 'lucide-react'
import { ProductGrid } from '../product-grid'
import { WishlistButton } from '@/components/wishlist/wishlist-button'
import { ReviewsSection } from '@/components/reviews/reviews-section'

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

interface ProductDetailClientProps {
  product: Product
  images: string[]
  relatedProducts: any[]
}

export function ProductDetailClient({ product, images, relatedProducts }: ProductDetailClientProps) {
  const { user, isLoaded } = useUser()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  const incrementQty = () => {
    if (quantity < product.quantity) {
      setQuantity(quantity + 1)
    }
  }

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-primary">Home</Link>
            <span className="text-gray-400">/</span>
            {product.category && (
              <>
                <Link href={`/categories/${product.category.slug}`} className="text-gray-500 hover:text-primary">
                  {product.category.name}
                </Link>
                <span className="text-gray-400">/</span>
              </>
            )}
            <span className="text-gray-900 dark:text-white font-medium truncate">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="w-24 h-24 text-gray-300" />
                </div>
              )}

              {/* Discount Badge */}
              {discount > 0 && (
                <Badge className="absolute top-4 left-4 bg-red-500 hover:bg-red-600 text-lg px-3 py-1">
                  -{discount}%
                </Badge>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                    disabled={selectedImage === 0}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={() => setSelectedImage(Math.min(images.length - 1, selectedImage + 1))}
                    disabled={selectedImage === images.length - 1}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Store */}
            <Link href={`/stores/${product.store.slug}`} className="flex items-center gap-2 text-sm">
              <Store className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">{product.store.name}</span>
              {product.store.isVerified && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </Link>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(product.rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                </span>
              </div>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 dark:text-gray-400">
                {product.purchaseCount} sold
              </span>
            </div>

            {/* Price */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  UGX {product.price.toLocaleString()}
                </span>
                {product.comparePrice && (
                  <span className="text-xl text-gray-500 line-through">
                    UGX {product.comparePrice.toLocaleString()}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-green-600 text-sm mt-1">
                  You save UGX {(product.comparePrice! - product.price).toLocaleString()}
                </p>
              )}
            </div>

            {/* Variants */}
            {product.hasVariants && product.variants.length > 0 && (
              <div className="space-y-3">
                <Label>Select Variant</Label>
                <Select onValueChange={setSelectedVariant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose options..." />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id} disabled={!variant.isActive || variant.quantity === 0}>
                        {variant.name} - UGX {variant.price.toLocaleString()}
                        {variant.quantity === 0 && ' (Out of Stock)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-3">
              <Label>Quantity</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="icon" onClick={decrementQty} disabled={quantity <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button variant="ghost" size="icon" onClick={incrementQty} disabled={quantity >= product.quantity}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {product.quantity > 0 ? `${product.quantity} available` : 'Out of stock'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button size="lg" className="flex-1" disabled={product.quantity === 0}>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <WishlistButton productId={product.id} variant="outline" size="lg" showText={false} />
              <Button size="lg" variant="outline">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Truck className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">Fast Delivery</p>
                  <p className="text-xs text-gray-500">2-5 business days</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">Buyer Protection</p>
                  <p className="text-xs text-gray-500">Full refund if issues</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mb-12">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  {product.description ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <p>{product.description}</p>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">
                      No detailed description available for this product.
                    </p>
                  )}
                </CardContent>
              </Card>
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
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Truck className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h4 className="font-medium">Delivery Information</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          We deliver to all major cities in East Africa. Estimated delivery times:
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                          <li>• Kampala, Nairobi, Dar es Salaam: 1-2 business days</li>
                          <li>• Other major cities: 2-5 business days</li>
                          <li>• Rural areas: 5-10 business days</li>
                        </ul>
                      </div>
                    </div>
                    {product.freeShipping && (
                      <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                        <p className="text-green-600 font-medium">🎉 Free shipping on this product!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Store Info */}
        <Card className="mb-12">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  {product.store.logo ? (
                    <img src={product.store.logo} alt={product.store.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{product.store.name}</h3>
                    {product.store.isVerified && (
                      <Badge variant="secondary">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified Seller
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {product.store.city}, {product.store.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      {product.store.rating.toFixed(1)} ({product.store.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/stores/${product.store.slug}`}>
                  <Button variant="outline">Visit Store</Button>
                </Link>
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Related Products</h2>
            <ProductGrid products={relatedProducts} />
          </div>
        )}
      </div>
    </div>
  )
}
