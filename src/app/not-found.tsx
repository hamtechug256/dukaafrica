'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Search, ArrowLeft, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-0 shadow-xl">
        <CardContent className="pt-8 pb-8 text-center">
          {/* 404 Illustration */}
          <div className="relative mb-6">
            <div className="text-[120px] font-bold text-gray-200 dark:text-gray-700 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="w-10 h-10 text-primary" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
            Oops! The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button asChild variant="default" className="gap-2 h-auto py-3">
              <Link href="/">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 h-auto py-3">
              <Link href="/products">
                <ShoppingBag className="w-4 h-4" />
                <span>Browse Products</span>
              </Link>
            </Button>
          </div>

          {/* Additional Help */}
          <div className="pt-6 border-t">
            <p className="text-sm text-gray-500 mb-3">Looking for something specific?</p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <Link href="/categories" className="text-primary hover:underline">
                Categories
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/stores" className="text-primary hover:underline">
                Stores
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/help" className="text-primary hover:underline">
                Help Center
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/dashboard" className="text-primary hover:underline">
                My Account
              </Link>
            </div>
          </div>

          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="mt-6 gap-2" 
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
