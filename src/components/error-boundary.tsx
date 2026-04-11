'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  maxRetries?: number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  retryCount: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState(prev => {
      const nextRetry = prev.retryCount + 1
      if (nextRetry > (this.props.maxRetries || 3)) {
        return { hasError: true, error: prev.error, retryCount: 0 }
      }
      return { hasError: false, error: null, retryCount: nextRetry }
    })
  }

  // Auto-recover from known Next.js router hydration issues
  componentDidMount() {
    if (this.state.hasError && this.state.error) {
      const msg = this.state.error.message || ''
      if (msg.includes('URL constructor') || msg.includes('is not a valid URL')) {
        const timer = setTimeout(() => {
          this.setState({ hasError: false, error: null, retryCount: 0 })
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    if (prevState.hasError && !this.state.hasError) {
      // Just recovered from an error
      console.log('[ErrorBoundary] Recovered from error')
    }
  }

  render() {
    if (this.state.hasError) {
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
