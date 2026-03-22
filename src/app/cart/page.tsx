'use client'

import { useCartStore } from '@/store/cart-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, Store } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, getSubtotal, getTotalSavings, getItemsByStore, clearCart } = useCartStore()
  const [couponCode, setCouponCode] = useState('')

  const subtotal = getSubtotal()
  const savings = getTotalSavings()
  const itemsByStore = getItemsByStore()
  const storeCount = Object.keys(itemsByStore).length

  const handleApplyCoupon = () => {
    // TODO: Validate and apply coupon
    console.log('Apply coupon:', couponCode)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            Shopping Cart
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {items.length} {items.length === 1 ? 'item' : 'items'} from {storeCount} {storeCount === 1 ? 'seller' : 'sellers'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Your cart is empty
              </h2>
              <p className="text-gray-500 mb-6">
                Looks like you haven't added any items to your cart yet.
              </p>
              <Button size="lg" asChild>
                <Link href="/products">
                  Start Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Actions Bar */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cart Items</h2>
                <Button variant="ghost" className="text-red-500" onClick={clearCart}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cart
                </Button>
              </div>

              {/* Items grouped by store */}
              {Object.entries(itemsByStore).map(([storeId, storeItems]) => (
                <Card key={storeId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-gray-400" />
                      <Link href={`/stores/${storeId}`} className="font-medium hover:text-primary">
                        {storeItems[0].storeName}
                      </Link>
                      <Badge variant="secondary">{storeItems.length} items</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {storeItems.map((item) => (
                      <div key={item.id} className="flex gap-4 py-4 border-b last:border-0 last:pb-0">
                        {/* Image */}
                        <Link href={`/products/${item.slug}`} className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.slug}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-primary"
                          >
                            {item.name}
                          </Link>
                          {item.variantName && (
                            <p className="text-sm text-gray-500 mt-0.5">{item.variantName}</p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center border rounded-lg">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-10 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.maxQuantity}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            <span className="text-sm text-gray-500">
                              {item.maxQuantity} available
                            </span>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 ml-auto"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900 dark:text-white">
                            UGX {(item.price * item.quantity).toLocaleString()}
                          </p>
                          {item.comparePrice && (
                            <p className="text-sm text-gray-500 line-through">
                              UGX {(item.comparePrice * item.quantity).toLocaleString()}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            UGX {item.price.toLocaleString()} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleApplyCoupon}>
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>

                  <Separator />

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Subtotal ({items.length} items)</span>
                      <span>UGX {subtotal.toLocaleString()}</span>
                    </div>
                    
                    {savings > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount Savings</span>
                        <span>-UGX {savings.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>UGX {subtotal.toLocaleString()}</span>
                  </div>

                  <Button className="w-full" size="lg" asChild>
                    <Link href="/checkout">
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Taxes calculated at checkout
                  </p>
                </CardContent>
              </Card>

              {/* Trust Badges */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <div className="text-2xl mb-1">🔒</div>
                      <p className="font-medium">Secure Payment</p>
                    </div>
                    <div>
                      <div className="text-2xl mb-1">🚚</div>
                      <p className="font-medium">Fast Delivery</p>
                    </div>
                    <div>
                      <div className="text-2xl mb-1">💰</div>
                      <p className="font-medium">Best Prices</p>
                    </div>
                    <div>
                      <div className="text-2xl mb-1">🛡️</div>
                      <p className="font-medium">Buyer Protection</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
