'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Package,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Plus,
  ArrowRight,
  Star,
  AlertCircle,
  Loader2,
  Store,
  Settings,
  Flashlight,
  Shield,
  Zap,
  ArrowUpRight,
  Clock,
  Percent,
  Menu,
  Home,
  BarChart3,
} from 'lucide-react'
import { MobileNav, BottomNav } from '@/components/dashboard/mobile-nav'
import { formatPrice } from '@/lib/currency'

// Fetch store data
async function fetchStore() {
  const res = await fetch('/api/seller/store')
  if (!res.ok) throw new Error('Failed to fetch store')
  return res.json()
}

// Fetch verification data
async function fetchVerification() {
  const res = await fetch('/api/seller/verification')
  if (!res.ok) return null
  return res.json()
}

// Seller navigation items
const sellerNavItems = [
  { href: '/seller/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/seller/products', icon: Package, label: 'Products' },
  { href: '/seller/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/seller/payouts', icon: DollarSign, label: 'Payouts' },
  { href: '/seller/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/seller/flash-sales', icon: Flashlight, label: 'Flash Sales' },
  { href: '/seller/verification', icon: Shield, label: 'Verification' },
  { href: '/seller/settings', icon: Settings, label: 'Settings' },
]

export default function SellerDashboardPage() {
  const { user, isLoaded } = useUser()

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-store'],
    queryFn: fetchStore,
  })

  const { data: verificationData } = useQuery({
    queryKey: ['seller-verification'],
    queryFn: fetchVerification,
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
  const currentTier = verificationData?.verification?.currentTier || 'STARTER'
  const tierCommission = currentTier === 'PREMIUM'
    ? (verificationData?.settings?.premiumCommissionRate || 8)
    : currentTier === 'VERIFIED'
      ? (verificationData?.settings?.verifiedCommissionRate || 10)
      : (verificationData?.settings?.starterCommissionRate || 15)
  const tierEscrowDays = currentTier === 'PREMIUM'
    ? (verificationData?.settings?.premiumEscrowDays || 3)
    : currentTier === 'VERIFIED'
      ? (verificationData?.settings?.verifiedEscrowDays || 5)
      : (verificationData?.settings?.starterEscrowDays || 7)

  const tierProgress = currentTier === 'PREMIUM' ? 100 : currentTier === 'VERIFIED' ? 50 : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Mobile Menu */}
              <MobileNav
                title="DuukaAfrica"
                badge="Seller"
                navItems={sellerNavItems}
                userType="seller"
                userEmail={user?.emailAddresses?.[0]?.emailAddress}
                showUpgrade={currentTier !== 'PREMIUM'}
                onUpgradeClick={() => window.location.href = '/seller/verification'}
              />
              <Link href="/" className="hidden md:flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
                  DuukaAfrica
                </h1>
                <Badge variant="secondary" className="ml-2">Seller</Badge>
              </Link>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/" className="hidden sm:block">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Store Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
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
                  Pending
                </Badge>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
              {store.city}, {store.country} • {store._count?.Product || 0} products
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/seller/products/new" className="flex-1 md:flex-none">
              <Button className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </Link>
            <Link href="/seller/settings" className="hidden md:block">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Verification Status Widget */}
        {currentTier !== 'PREMIUM' && (
          <Card className="mb-6 md:mb-8 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`p-2 md:p-3 rounded-full ${
                    currentTier === 'VERIFIED' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {currentTier === 'VERIFIED' ? <Shield className="w-5 h-5 md:w-6 md:h-6" /> : <Zap className="w-5 h-5 md:w-6 md:h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                        {currentTier === 'VERIFIED' ? 'Verified Seller' : 'Starter Tier'}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {tierCommission}% commission
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                      Upgrade to {currentTier === 'VERIFIED' ? 'Premium' : 'Verified'} for lower fees ({currentTier === 'VERIFIED' ? '8%' : '10%'}) and faster payouts
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                        <span>{tierEscrowDays} day escrow</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Percent className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                        <span>{tierCommission}% commission</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Link href="/seller/verification" className="w-full md:w-auto">
                  <Button className="w-full md:w-auto whitespace-nowrap">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Upgrade Tier
                  </Button>
                </Link>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs md:text-sm mb-1">
                  <span className="text-gray-600">Tier Progress</span>
                  <span className="font-medium">{tierProgress}%</span>
                </div>
                <Progress value={tierProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(store.realTotalSales || 0, store.currency)}
                  </p>
                </div>
                <div className="p-2 md:p-3 bg-green-50 dark:bg-green-950/30 rounded-full">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Orders</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                    {store.realTotalOrders || 0}
                  </p>
                </div>
                <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                  <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Products</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                    {store._count?.Product || 0}
                  </p>
                </div>
                <div className="p-2 md:p-3 bg-purple-50 dark:bg-purple-950/30 rounded-full">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Rating</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    {store.rating?.toFixed(1) || '0.0'}
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500" />
                  </p>
                </div>
                <div className="p-2 md:p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-full">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
              <CardDescription className="hidden sm:block">Manage your store efficiently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <Link href="/seller/products">
                  <Button variant="outline" className="w-full h-16 md:h-20 flex flex-col">
                    <Package className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    <span className="text-xs md:text-sm">Products</span>
                  </Button>
                </Link>
                <Link href="/seller/orders">
                  <Button variant="outline" className="w-full h-16 md:h-20 flex flex-col">
                    <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    <span className="text-xs md:text-sm">Orders</span>
                  </Button>
                </Link>
                <Link href="/seller/flash-sales">
                  <Button variant="outline" className="w-full h-16 md:h-20 flex flex-col">
                    <Flashlight className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    <span className="text-xs md:text-sm">Flash Sales</span>
                  </Button>
                </Link>
                <Link href="/seller/analytics">
                  <Button variant="outline" className="w-full h-16 md:h-20 flex flex-col">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    <span className="text-xs md:text-sm">Analytics</span>
                  </Button>
                </Link>
                <Link href="/seller/payouts">
                  <Button variant="outline" className="w-full h-16 md:h-20 flex flex-col">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    <span className="text-xs md:text-sm">Payouts</span>
                  </Button>
                </Link>
                <Link href="/seller/verification">
                  <Button variant="outline" className="w-full h-16 md:h-20 flex flex-col">
                    <Shield className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    <span className="text-xs md:text-sm">Verification</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Products */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg">Recent Products</CardTitle>
                  <CardDescription className="hidden sm:block">Your latest listings</CardDescription>
                </div>
                <Link href="/seller/products">
                  <Button variant="ghost" size="sm" className="hidden md:flex">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {store.products?.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {store.products.map((product: any) => (
                    <div key={product.id} className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate text-sm md:text-base">
                          {product.name}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {formatPrice(product.price, store.currency)}
                        </p>
                      </div>
                      <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {product.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8">
                  <Package className="w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-400 mb-3 md:mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-3 md:mb-4 text-sm md:text-base">
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

      {/* Bottom Navigation for Mobile */}
      <BottomNav items={sellerNavItems} />
    </div>
  )
}
