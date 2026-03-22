'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Plus,
  ArrowRight,
  Eye,
  Star,
  AlertCircle,
  Loader2,
  Store,
  Settings,
  Flashlight
} from 'lucide-react'

// Fetch store data
async function fetchStore() {
  const res = await fetch('/api/seller/store')
  if (!res.ok) throw new Error('Failed to fetch store')
  return res.json()
}

export default function SellerDashboardPage() {
  const { user, isLoaded } = useUser()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-store'],
    queryFn: fetchStore,
  })

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Store Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You need to set up your store before accessing the dashboard.
            </p>
            <Link href="/seller/onboarding">
              <Button>
                Set Up Store
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const store = data.store

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
                DuukaAfrica
              </h1>
              <Badge variant="secondary" className="ml-2">Seller</Badge>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  View Store
                </Button>
              </Link>
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {store.name}
              </h2>
              {store.isVerified ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <Star className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Pending Verification
                </Badge>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {store.city}, {store.country} • {store._count?.products || 0} products
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/seller/products/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </Link>
            <Link href="/seller/settings">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    UGX {store.totalSales?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {store.totalOrders || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                  <ShoppingBag className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Products</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {store._count?.products || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-full">
                  <Package className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rating</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    {store.rating?.toFixed(1) || '0.0'}
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-full">
                  <TrendingUp className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your store efficiently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/seller/products">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <Package className="w-6 h-6 mb-2" />
                    Manage Products
                  </Button>
                </Link>
                <Link href="/seller/orders">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <ShoppingBag className="w-6 h-6 mb-2" />
                    View Orders
                  </Button>
                </Link>
                <Link href="/seller/flash-sales">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <Flashlight className="w-6 h-6 mb-2" />
                    Flash Sales
                  </Button>
                </Link>
                <Link href="/seller/analytics">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <TrendingUp className="w-6 h-6 mb-2" />
                    Analytics
                  </Button>
                </Link>
                <Link href="/seller/payouts">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <DollarSign className="w-6 h-6 mb-2" />
                    Payouts
                  </Button>
                </Link>
                <Link href="/seller/settings">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <Settings className="w-6 h-6 mb-2" />
                    Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Products</CardTitle>
                  <CardDescription>Your latest listings</CardDescription>
                </div>
                <Link href="/seller/products">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {store.products?.length > 0 ? (
                <div className="space-y-4">
                  {store.products.map((product: any) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          UGX {product.price?.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No products yet. Start adding products to your store!
                  </p>
                  <Link href="/seller/products/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Product
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
