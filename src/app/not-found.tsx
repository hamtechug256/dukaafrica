'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, ShoppingBag } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700">404</h1>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Page Not Found
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. 
          The page may have been moved or doesn't exist.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <Link href="/products">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
          </Link>
          
          <Link href="/search">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
