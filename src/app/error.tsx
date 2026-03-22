'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import Link from 'next/link'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-0 shadow-xl">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            We're sorry, but something unexpected happened. Our team has been notified 
            and we're working to fix it.
          </p>

          {/* Error ID for support */}
          {error.digest && (
            <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">
                Error Reference: <span className="font-mono">{error.digest}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button onClick={reset} className="gap-2 h-auto py-3">
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>
            <Button asChild variant="outline" className="gap-2 h-auto py-3">
              <Link href="/">
                <Home className="w-4 h-4" />
                <span>Go Home</span>
              </Link>
            </Button>
          </div>

          {/* Help Section */}
          <div className="pt-6 border-t">
            <p className="text-sm text-gray-500 mb-3">
              If this problem persists, please contact our support team.
            </p>
            <Button asChild variant="ghost" className="gap-2">
              <a href="mailto:support@duukaafrica.com">
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
            </Button>
          </div>

          {/* Development Mode Details */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                Development Error Details:
              </p>
              <p className="text-xs font-mono text-red-500 break-all">
                {error.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
