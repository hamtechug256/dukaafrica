'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Check, Loader2, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BackInStockNotificationProps {
  productId: string
  productName: string
  productSlug: string
  currentStock: number
  className?: string
  variant?: 'inline' | 'card'
}

export function BackInStockNotification({
  productId,
  productName,
  productSlug,
  currentStock,
  className = '',
  variant = 'inline',
}: BackInStockNotificationProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await fetch(`/api/notifications/back-in-stock/check?productId=${productId}`)
        if (res.ok) {
          const data = await res.json()
          setIsSubscribed(data.isSubscribed || false)
        }
      } catch {
        // ignore
      }
    }
    checkSubscription()
  }, [productId])

  const handleSubscribe = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/notifications/back-in-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          email,
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
        toast({
          title: 'You\'re on the list!',
          description: `We'll email you when ${productName} is back in stock.`,
        })
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to subscribe')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/notifications/back-in-stock?productId=${productId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setIsSubscribed(false)
        toast({
          title: 'Notification cancelled',
          description: 'You won\'t receive updates for this product.',
        })
      }
    } catch {
      setError('Failed to unsubscribe')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (currentStock > 0) return null

  if (variant === 'card') {
    return (
      <div className={`bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-orange-800 dark:text-orange-200">
              Out of Stock
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
              Get notified when this product is back in stock.
            </p>

            {isSubscribed ? (
              <div className="mt-3 flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm">You&apos;ll be notified when back in stock</span>
                <button
                  onClick={handleUnsubscribe}
                  disabled={isSubmitting}
                  className="text-xs text-orange-600 hover:underline ml-2"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Notify Me'
                  )}
                </Button>
              </div>
            )}
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {isSubscribed ? (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          <Bell className="w-3 h-3 mr-1" />
          Subscribed to back-in-stock
          <button
            onClick={handleUnsubscribe}
            disabled={isSubmitting}
            className="ml-2 text-xs hover:underline"
          >
            Cancel
          </button>
        </Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const email = prompt('Enter your email to get notified when back in stock:')
            if (email) {
              setEmail(email)
              setTimeout(() => handleSubscribe(), 0)
            }
          }}
          disabled={isSubmitting}
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Bell className="w-4 h-4 mr-1" />
              Notify When Back in Stock
            </>
          )}
        </Button>
      )}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
