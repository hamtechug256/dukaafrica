'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Heart, Trash2, ShoppingCart, Loader2, Package } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { useState } from 'react'
import { formatPrice } from '@/lib/currency'

async function fetchWishlist() {
  const res = await fetch('/api/wishlist')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function WishlistPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const { addItem } = useCartStore()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: fetchWishlist,
  })

  const wishlist = data?.wishlist || []

  const handleRemove = async (productId: string) => {
    await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' })
    refetch()
  }

  const handleAddToCart = (item: any) => {
    addItem({
      productId: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      comparePrice: item.product.comparePrice,
      quantity: 1,
      image: item.product.images ? JSON.parse(item.product.images)[0] : null,
      storeId: item.product.store.id,
      storeName: item.product.store.name,
      maxQuantity: item.product.quantity,
    })
    handleRemove(item.productId)
  }

  const handleAddSelectedToCart = () => {
    selectedItems.forEach(id => {
      const item = wishlist.find((w: any) => w.id === id)
      if (item) handleAddToCart(item)
    })
    setSelectedItems([])
  }

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === wishlist.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(wishlist.map((w: any) => w.id))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="w-6 h-6" />
            My Wishlist
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {wishlist.length} saved items
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          </div>
        ) : wishlist.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-gray-500 mb-4">
                Save items you love by clicking the heart icon
              </p>
              <Link href="/products">
                <Button>Browse Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Checkbox
                  id="selectAll"
                  checked={selectedItems.length === wishlist.length}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="selectAll" className="text-sm cursor-pointer">
                  Select All ({wishlist.length})
                </label>
              </div>
              {selectedItems.length > 0 && (
                <Button onClick={handleAddSelectedToCart}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add {selectedItems.length} to Cart
                </Button>
              )}
            </div>

            {/* Wishlist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlist.map((item: any) => (
                <Card key={item.id} className="group overflow-hidden">
                  <div className="relative aspect-square bg-gray-100">
                    {item.product.images ? (
                      <img
                        src={JSON.parse(item.product.images)[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                      </div>
                    )}

                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="bg-white"
                      />
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAddToCart(item)}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleRemove(item.productId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Out of Stock Badge */}
                    {item.product.quantity === 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="destructive">Out of Stock</Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="font-medium line-clamp-2 hover:text-primary"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{item.product.store.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="font-bold text-lg">{formatPrice(item.product.price, item.product.store?.currency)}</p>
                        {item.product.comparePrice && (
                          <p className="text-sm text-gray-500 line-through">
                            {formatPrice(item.product.comparePrice, item.product.store?.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
