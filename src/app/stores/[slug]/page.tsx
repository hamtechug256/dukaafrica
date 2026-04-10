'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Store,
  MapPin,
  Star,
  Package,
  Clock,
  ChevronRight,
  Loader2,
  ShoppingBag,
  CheckCircle,
  Grid,
  List,
  SlidersHorizontal
} from 'lucide-react'
import { useState } from 'react'

const countryFlags: Record<string, string> = {
  UGANDA: '🇺🇬',
  KENYA: '🇰🇪',
  TANZANIA: '🇹🇿',
  RWANDA: '🇷🇼',
}

async function fetchStore(slug: string) {
  const res = await fetch(`/api/stores/${slug}`)
  if (!res.ok) throw new Error('Failed to fetch store')
  return res.json()
}

export default function StoreProfilePage() {
  const { slug } = useParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data, isLoading, error } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => fetchStore(slug as string),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
            <p className="text-gray-500 mb-4">
              This store doesn't exist or is no longer active.
            </p>
            <Link href="/products">
              <Button>Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const store = data.store
  const products = store.products || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Store Banner */}
      <div className="h-48 bg-gradient-to-r from-orange-500 to-green-500 relative">
        {store.banner && (
          <img
            src={store.banner}
            alt={`${store.name} store banner`}
            className="w-full h-full object-cover absolute inset-0"
          />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Store Info */}
        <div className="relative -mt-16 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-800 shadow-lg">
                  <AvatarImage src={store.logo} />
                  <AvatarFallback className="text-2xl bg-primary text-white">
                    {store.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{store.name}</h1>
                  {store.isVerified && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  <span className="text-gray-500">
                    {countryFlags[store.country]} {store.country}
                  </span>
                </div>

                {store.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{store.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {store.rating?.toFixed(1) || '0.0'}
                    </span>
                    <span>({store.reviewCount || 0} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    <span>{store._count?.products || 0} products</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span>{store._count?.orders || 0} orders</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Joined {new Date(store.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Products</h2>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {products.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium">No products yet</h3>
                <p className="text-gray-500">This store hasn't listed any products.</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product: any) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div className="aspect-square bg-gray-100 relative">
                      {product.imagesArray?.[0] ? (
                        <img
                          src={product.imagesArray[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {product.comparePrice && (
                        <Badge className="absolute top-2 left-2 bg-red-500">
                          Sale
                        </Badge>
                      )}
                      {product.quantity === 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="secondary">Out of Stock</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {product.rating?.toFixed(1) || '0.0'} ({product.reviewCount || 0})
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">
                          {product.currency} {product.price.toLocaleString()}
                        </span>
                        {product.comparePrice && (
                          <span className="text-sm text-gray-400 line-through">
                            {product.currency} {product.comparePrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product: any) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.imagesArray?.[0] ? (
                            <img
                              src={product.imagesArray[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-2">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.category?.name}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {product.rating?.toFixed(1) || '0.0'} ({product.reviewCount || 0})
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {product.currency} {product.price.toLocaleString()}
                          </p>
                          {product.comparePrice && (
                            <p className="text-sm text-gray-400 line-through">
                              {product.currency} {product.comparePrice.toLocaleString()}
                            </p>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-400 mt-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
