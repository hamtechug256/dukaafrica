'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Store } from 'lucide-react'
import Link from 'next/link'

export default function SellerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Seller dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Store className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Seller Dashboard Error</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            We encountered an issue loading your seller dashboard. Your data is safe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/">
                <Store className="w-4 h-4" />
                Go to Store
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
