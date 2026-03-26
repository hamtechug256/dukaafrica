'use client'

import { useSearchParams } from 'next/navigation'
import { useCartStore } from '@/store/cart-store'
import { useCheckoutStore } from '@/store/checkout-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, Home, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const reference = searchParams.get('reference')
  const { clearCart } = useCartStore()
  const { reset: resetCheckout } = useCheckoutStore()
  const [orderDetails, setOrderDetails] = useState<any>(null)

  useEffect(() => {
    // Clear cart and checkout state
    clearCart()
    resetCheckout()

    // Fetch order details
    if (orderId) {
      fetch(`/api/orders/${orderId}`)
        .then(res => res.json())
        .then(data => setOrderDetails(data.order))
        .catch(console.error)
    }
  }, [orderId, clearCart, resetCheckout])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center">
        <CardContent className="pt-8 pb-8">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Order Placed Successfully! 🎉
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for your order. You will receive a confirmation SMS shortly.
          </p>

          {/* Order Details */}
          {orderDetails && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
                <span className="font-semibold">{orderDetails.orderNumber}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="font-semibold">UGX {orderDetails.total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="font-semibold text-green-600">Confirmed</span>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium mb-2">What's Next?</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <Package className="w-4 h-4 mt-0.5 text-blue-500" />
                <span>The seller will prepare your order for shipping</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                <span>You'll receive SMS updates on your order status</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                <span>Track your order from your dashboard</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/orders" className="flex-1">
              <Button className="w-full">
                <Package className="w-4 h-4 mr-2" />
                Track Order
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
