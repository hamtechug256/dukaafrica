'use client'

import { useSearchParams } from 'next/navigation'
import { useCartStore } from '@/store/cart-store'
import { useCheckoutStore } from '@/store/checkout-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, Home, Loader2, Clock, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useRef, Suspense, useCallback } from 'react'

const MAX_POLL_SECONDS = 90
const POLL_INTERVAL_MS = 4000

type PaymentState = 'polling' | 'paid' | 'failed' | 'cancelled' | 'timeout' | 'not_found' | 'error'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const isCancelled = searchParams.get('cancelled') === 'true'
  const { clearCart } = useCartStore()
  const { reset: resetCheckout } = useCheckoutStore()
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [paymentState, setPaymentState] = useState<PaymentState>('polling')
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [pollError, setPollError] = useState<string | null>(null)
  const hasPolledRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    clearCart()
    resetCheckout()
  }, [clearCart, resetCheckout])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const manualRefresh = useCallback(async () => {
    if (!orderId) return
    setPaymentState('polling')
    setPollError(null)
    setSecondsElapsed(0)

    try {
      const res = await fetch(`/api/pesapal/status?orderId=${orderId}`)
      const data = await res.json()
      const pesapalStatus = data.status ?? data.paymentStatus

      if (pesapalStatus === 'COMPLETED' || pesapalStatus === 'PAID') {
        setPaymentState('paid')
        const orderRes = await fetch(`/api/orders/${orderId}`)
        const orderData = await orderRes.json()
        if (orderData.order) setOrderDetails(orderData.order)
        return
      }
      if (pesapalStatus === 'FAILED') {
        setPaymentState('failed')
        return
      }
      if (pesapalStatus === 'CANCELLED') {
        setPaymentState('cancelled')
        return
      }
      if (pesapalStatus === null && data.resolvedLocally === false) {
        setPaymentState('not_found')
        setPollError('This transaction could not be found on Pesapal. The payment may not have been completed.')
        return
      }
      // Still pending
      setPaymentState('timeout')
      setPollError('Payment is still being processed by Pesapal. This may take a few minutes.')
    } catch {
      setPaymentState('error')
      setPollError('Unable to reach the server. Check your connection and try again.')
    }
  }, [orderId])

  // Initial poll + fetch order details
  useEffect(() => {
    if (!orderId || hasPolledRef.current) return
    hasPolledRef.current = true

    const poll = async () => {
      // Fetch order details first
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        const data = await res.json()
        if (data.order) {
          setOrderDetails(data.order)
          // If already paid locally (IPN arrived before redirect)
          if (data.order.paymentStatus === 'PAID') {
            setPaymentState('paid')
            return
          }
        }
      } catch {
        // continue polling
      }

      // If user was redirected with cancelled flag
      if (isCancelled) {
        setPaymentState('cancelled')
        return
      }

      // Start elapsed time counter
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1)
      }, 1000)

      // Start polling Pesapal
      let count = 0
      const maxPolls = Math.ceil(MAX_POLL_SECONDS / (POLL_INTERVAL_MS / 1000))

      intervalRef.current = setInterval(async () => {
        count++

        try {
          const res = await fetch(`/api/pesapal/status?orderId=${orderId}`)
          const data = await res.json()
          const pesapalStatus = data.status ?? data.paymentStatus

          console.log(`[checkout success] poll #${count}: status=${pesapalStatus}`, data)

          if (pesapalStatus === 'COMPLETED' || pesapalStatus === 'PAID') {
            setPaymentState('paid')
            stopPolling()
            // Re-fetch order with updated status
            const orderRes = await fetch(`/api/orders/${orderId}`)
            const orderData = await orderRes.json()
            if (orderData.order) setOrderDetails(orderData.order)
            return
          }

          if (pesapalStatus === 'FAILED') {
            setPaymentState('failed')
            stopPolling()
            return
          }

          if (pesapalStatus === 'CANCELLED') {
            setPaymentState('cancelled')
            stopPolling()
            return
          }

          if (pesapalStatus === null && data.resolvedLocally === false) {
            setPaymentState('not_found')
            setPollError('This transaction could not be found on Pesapal. The payment may not have been completed.')
            stopPolling()
            return
          }

          if (count >= maxPolls) {
            setPaymentState('timeout')
            setPollError('Payment is still being processed by Pesapal. This may take a few minutes. Don\'t worry — your order is safe and will be confirmed automatically once Pesapal sends the notification.')
            stopPolling()
          }
        } catch {
          if (count >= maxPolls) {
            setPaymentState('error')
            setPollError('We couldn\'t verify your payment right now. Your order is recorded and will be updated automatically.')
            stopPolling()
          }
        }
      }, POLL_INTERVAL_MS)
    }

    poll()

    return () => {
      stopPolling()
    }
  }, [orderId, isCancelled, stopPolling])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isPolling = paymentState === 'polling'
  const isPaid = paymentState === 'paid'
  const isFailed = paymentState === 'failed' || paymentState === 'cancelled'
  const isWaiting = paymentState === 'timeout' || paymentState === 'error'
  const isNotFound = paymentState === 'not_found'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center">
        <CardContent className="pt-8 pb-8">
          {/* Status Icon */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            {isPolling && (
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
            {isWaiting && (
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-16 h-16 text-blue-500" />
              </div>
            )}
            {isNotFound && (
              <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-16 h-16 text-orange-500" />
              </div>
            )}
          </div>

          {/* Polling State — with live timer */}
          {isPolling && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Waiting for Payment Confirmation
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {secondsElapsed < 5
                  ? 'Checking payment status with Pesapal...'
                  : secondsElapsed < 20
                    ? 'Still waiting for Pesapal to confirm...'
                    : 'This is taking a bit longer than usual...'
                }
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {formatTime(secondsElapsed)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  elapsed
                </span>
                <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-yellow-500 h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (secondsElapsed / MAX_POLL_SECONDS) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {Math.max(0, Math.ceil((MAX_POLL_SECONDS - secondsElapsed)))}s
                </span>
              </div>
            </>
          )}

          {/* Paid */}
          {isPaid && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Confirmed!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your payment was successful. Thank you for your order! The seller will begin preparing your shipment.
              </p>
            </>
          )}

          {/* Failed / Cancelled */}
          {isFailed && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {paymentState === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {paymentState === 'cancelled'
                  ? 'You cancelled the payment. No charges were made. Feel free to place a new order anytime.'
                  : 'The payment could not be completed. No charges were made. Please try again with a different payment method.'}
              </p>
            </>
          )}

          {/* Timeout / Still Processing */}
          {isWaiting && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Still Processing
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Your order is recorded and safe. Payment confirmation may take a few minutes, especially with mobile money.
              </p>
              {pollError && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400">{pollError}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6">
                <Button variant="outline" size="sm" onClick={manualRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </Button>
              </div>
            </>
          )}

          {/* Not Found */}
          {isNotFound && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Transaction Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                The payment was not completed on Pesapal&apos;s side. This can happen if the payment page was closed before finishing.
              </p>
              {pollError && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-700 dark:text-orange-400">{pollError}</p>
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
                  <span className="font-semibold font-mono text-sm">{orderDetails.orderNumber}</span>
                </div>
              )}
              {orderDetails.trackingId && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Tracking ID:</span>
                  <span className="font-mono text-xs text-gray-500 break-all">{orderDetails.trackingId}</span>
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
                  isNotFound ? 'text-orange-600' :
                  'text-yellow-600'
                }`}>
                  {isPaid ? 'Confirmed' :
                   isFailed ? (paymentState === 'cancelled' ? 'Cancelled' : 'Failed') :
                   isNotFound ? 'Not Found' :
                   isPolling ? 'Processing...' :
                   'Pending'}
                </span>
              </div>
            </div>
          )}

          {/* What's Next — only when paid */}
          {isPaid && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium mb-2 text-green-800 dark:text-green-300">What&apos;s Next?</h3>
              <ul className="text-sm text-green-700 dark:text-green-400 space-y-2">
                <li className="flex items-start gap-2">
                  <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>The seller will prepare and ship your order</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>You&apos;ll receive SMS/email updates on delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Track your order anytime from your dashboard</span>
                </li>
              </ul>
            </div>
          )}

          {/* Reassurance note when waiting */}
          {isWaiting && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Good to know:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Your order has been recorded in our system</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Stock has been reserved for your items</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>Pesapal will send us a confirmation automatically — no action needed from you</span>
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

          {/* Need help link */}
          {!isPaid && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Having trouble?{' '}
              <Link href="/contact" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                Contact support
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
