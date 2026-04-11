'use client'

import { useSearchParams } from 'next/navigation'
import { useCartStore } from '@/store/cart-store'
import { useCheckoutStore } from '@/store/checkout-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, Home, ArrowRight, Loader2, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useRef, Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const reference = searchParams.get('reference')
  const { clearCart } = useCartStore()
  const { reset: resetCheckout } = useCheckoutStore()
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const [pollError, setPollError] = useState<string | null>(null)
  const hasPolledRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Clear cart and checkout state
    clearCart()
    resetCheckout()
  }, [clearCart, resetCheckout])

  // Poll for payment status
  useEffect(() => {
    if (!orderId || hasPolledRef.current) return
    hasPolledRef.current = true

    const pollPaymentStatus = async () => {
      // First, fetch order details
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        const data = await res.json()
        if (data.order) {
          setOrderDetails(data.order)
          setPaymentStatus(data.order.paymentStatus)

          if (data.order.paymentStatus === 'PAID') {
            setIsPolling(false)
            return
          }
        }
      } catch {
        // Continue polling
      }

      // If not paid yet, poll Pesapal status endpoint every 3 seconds (max 20 times = 60 seconds)
      let count = 0
      const maxPolls = 20
      intervalRef.current = setInterval(async () => {
        count++
        setPollCount(count)

        try {
          const res = await fetch(`/api/pesapal/status?orderId=${orderId}`)
          const data = await res.json()

          // API returns { status: 'COMPLETED' | 'FAILED' | ... } not paymentStatus
          const pesapalStatus = data.status || data.paymentStatus
          console.log(`[checkout success] poll #${count}:`, pesapalStatus, data)

          if (pesapalStatus === 'PAID' || pesapalStatus === 'COMPLETED') {
            setPaymentStatus('PAID')
            setIsPolling(false)
            if (intervalRef.current) clearInterval(intervalRef.current)

            // Re-fetch order details with updated status
            const orderRes = await fetch(`/api/orders/${orderId}`)
            const orderData = await orderRes.json()
            if (orderData.order) {
              setOrderDetails(orderData.order)
            }
            return
          }

          if (pesapalStatus === 'FAILED' || pesapalStatus === 'CANCELLED') {
            setPaymentStatus(pesapalStatus)
            setIsPolling(false)
            if (intervalRef.current) clearInterval(intervalRef.current)
            return
          }

          if (count >= maxPolls) {
            setIsPolling(false)
            setPollError('Payment is still processing. You will receive a confirmation via SMS once payment is complete.')
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
        } catch {
          if (count >= maxPolls) {
            setIsPolling(false)
            setPollError('Unable to verify payment status. Please check your order from your dashboard.')
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
        }
      }, 3000)
    }

    pollPaymentStatus()

    // Proper cleanup — stops polling if component unmounts
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Determine what to show based on payment status
  const isPaid = paymentStatus === 'PAID'
  const isFailed = paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED'
  const isProcessing = isPolling && !isPaid && !isFailed

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center">
        <CardContent className="pt-8 pb-8">
          {/* Status Icon */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            {isProcessing && (
              <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center animate-pulse">
                <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
              </div>
            )}
            {isPaid && (
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            )}
            {isFailed && (
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
            )}
            {!isProcessing && !isPaid && !isFailed && (
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-16 h-16 text-blue-500" />
              </div>
            )}
          </div>

          {/* Title & Description based on status */}
          {isProcessing && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Processing Payment...
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Waiting for payment confirmation from Pesapal. Please complete payment on the Pesapal page if you haven't already.
              </p>
            </>
          )}
          {isPaid && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Order Placed Successfully!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Thank you for your order. You will receive a confirmation SMS shortly.
              </p>
            </>
          )}
          {isFailed && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment {paymentStatus === 'CANCELLED' ? 'Cancelled' : 'Failed'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your payment was not completed. You can try placing the order again from your dashboard.
              </p>
            </>
          )}
          {!isProcessing && !isPaid && !isFailed && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Order Created
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your order has been created. Payment confirmation is pending.
              </p>
              {pollError && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">{pollError}</p>
                </div>
              )}
            </>
          )}

          {/* Order Details */}
          {orderDetails && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
              {orderDetails.orderNumber && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
                  <span className="font-semibold">{orderDetails.orderNumber}</span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="font-semibold">
                  {orderDetails.currency || 'UGX'} {Number(orderDetails.total || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Payment Status:</span>
                <span className={`font-semibold ${
                  isPaid ? 'text-green-600' :
                  isFailed ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {isPaid ? 'Confirmed' :
                   isFailed ? paymentStatus :
                   paymentStatus || 'Processing'}
                </span>
              </div>
            </div>
          )}

          {/* Next Steps (only show when paid) */}
          {isPaid && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium mb-2">What's Next?</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <Package className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>The seller will prepare your order for shipping</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>You'll receive SMS updates on your order status</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>Track your order from your dashboard</span>
                </li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/orders" className="flex-1">
              <Button className="w-full">
                <Package className="w-4 h-4 mr-2" />
                {isPaid ? 'Track Order' : 'View Orders'}
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
      <SuccessContent />
    </Suspense>
  )
}
