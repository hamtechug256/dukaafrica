'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  maxRetries?: number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  retryCount: number
  isRetrying: boolean
}

/**
 * Detects known Next.js 16 router hydration timing errors.
 * These occur when useActionQueue returns an undefined canonicalUrl
 * during the initial client-side hydration before the RSC payload
 * has been fully processed.
 */
function isNextJSHydrationError(error: Error): boolean {
  const msg = error.message || ''
  return (
    msg.includes('URL constructor') ||
    msg.includes('is not a valid URL') ||
    msg.includes('Failed to execute')
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0, isRetrying: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, retryCount: 0, isRetrying: false }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)

    // Auto-recover from Next.js 16 router hydration timing errors
    if (isNextJSHydrationError(error)) {
      this.scheduleRecovery()
    }
  }

  private scheduleRecovery() {
    // Clear any existing timer
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
    }

    // Show loading state immediately (not error page)
    this.setState({ isRetrying: true })

    // Exponential backoff: 200ms, 300ms, 450ms, 675ms, 1013ms, ...
    const delay = Math.min(200 * Math.pow(1.5, this.state.retryCount), 3000)
    const maxRetries = this.props.maxRetries || 10

    this.recoveryTimer = setTimeout(() => {
      this.setState(prev => {
        if (prev.retryCount >= maxRetries) {
          // Exhausted retries — show actual error UI
          console.error('[ErrorBoundary] Max retries exceeded for hydration error')
          return { hasError: true, error: prev.error, retryCount: 0, isRetrying: false }
        }
        // Retry — reset error state so React re-renders children
        return { hasError: false, error: null, retryCount: prev.retryCount + 1, isRetrying: false }
      })
    }, delay)
  }

  handleReset = () => {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
    }
    this.setState(prev => {
      const nextRetry = prev.retryCount + 1
      if (nextRetry > (this.props.maxRetries || 3)) {
        return { hasError: true, error: prev.error, retryCount: 0, isRetrying: false }
      }
      return { hasError: false, error: null, retryCount: nextRetry, isRetrying: false }
    })
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
    }
  }

  render() {
    if (this.state.hasError) {
      // For known Next.js hydration errors, show a loading spinner while retrying
      // This prevents the jarring flash of an error page
      if (this.state.isRetrying && isNextJSHydrationError(this.state.error!)) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading page...</p>
            </div>
          </div>
        )
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                An unexpected error occurred. Please try again or refresh the page.
              </p>
              {this.state.error?.message && (
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 rounded-lg p-3 break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
