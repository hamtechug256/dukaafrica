'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Smartphone, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const paymentProviders: Record<string, { name: string; color: string }> = {
  MTN: { name: 'MTN Mobile Money', color: 'bg-yellow-500' },
  AIRTEL: { name: 'Airtel Money', color: 'bg-red-500' },
  MPESA: { name: 'M-Pesa', color: 'bg-green-500' },
}

export default function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data.order)
        setPhoneNumber(data.order?.shippingPhone || '')
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [orderId])

  const handlePayment = async () => {
    if (!phoneNumber) {
      setMessage('Please enter your phone number')
      return
    }

    setIsPaying(true)
    setPaymentStatus('processing')
    setMessage('')

    try {
      const provider = order?.payment?.provider?.toLowerCase() || 'mtn'
      const response = await fetch(`/api/payments/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, phoneNumber }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message)
        pollPaymentStatus()
      } else {
        setPaymentStatus('failed')
        setMessage(data.error || 'Payment failed')
      }
    } catch (error) {
      setPaymentStatus('failed')
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsPaying(false)
    }
  }

  const pollPaymentStatus = async () => {
    let attempts = 0
    const maxAttempts = 30

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPaymentStatus('failed')
        setMessage('Payment timeout. Please check your phone for the payment prompt.')
        return
      }

      attempts++

      try {
        const response = await fetch(`/api/orders/${orderId}/payment-status`)
        const data = await response.json()

        if (data.status === 'PAID') {
          setPaymentStatus('success')
          setMessage('Payment successful!')
          setTimeout(() => router.push(`/checkout/success?orderId=${orderId}`), 2000)
        } else if (data.status === 'FAILED') {
          setPaymentStatus('failed')
          setMessage('Payment failed. Please try again.')
        } else {
          setTimeout(poll, 3000)
        }
      } catch (error) {
        setTimeout(poll, 3000)
      }
    }

    poll()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const provider = paymentProviders[order.payment?.provider] || paymentProviders.MTN

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className={`w-16 h-16 ${provider.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <CardTitle>{provider.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Order</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">UGX {order.total?.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Payment Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+256 7XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={paymentStatus === 'processing' || paymentStatus === 'success'}
            />
          </div>

          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              paymentStatus === 'success' ? 'bg-green-50 text-green-700' :
              paymentStatus === 'failed' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {paymentStatus === 'success' && <CheckCircle className="w-5 h-5" />}
              {paymentStatus === 'failed' && <AlertCircle className="w-5 h-5" />}
              {paymentStatus === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{message}</span>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handlePayment}
            disabled={isPaying || paymentStatus === 'success' || paymentStatus === 'processing'}
          >
            {isPaying || paymentStatus === 'processing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay UGX ${order.total?.toLocaleString()}`
            )}
          </Button>

          <div className="text-sm text-gray-500 text-center">
            <p>You will receive a payment prompt on your phone.</p>
            <p>Enter your PIN to complete the payment.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
