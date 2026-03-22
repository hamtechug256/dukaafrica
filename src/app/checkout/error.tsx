'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Checkout error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Checkout Error</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            We encountered an issue during checkout. Your cart items are safe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/cart">
                <ShoppingCart className="w-4 h-4" />
                Return to Cart
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
