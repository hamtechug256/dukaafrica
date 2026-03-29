'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Settings,
  BarChart3,
  Shield,
  Loader2,
  Layers,
  LogOut,
  Menu,
  Home,
} from 'lucide-react'
import { AccessDeniedPage } from '@/components/admin/access-denied-page'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'

const sidebarLinks = [
  { href: '/admin', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/categories', icon: Layers, label: 'Categories' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/disputes', icon: AlertTriangle, label: 'Disputes' },
  { href: '/admin/escrow', icon: Shield, label: 'Escrow' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

async function fetchUserRole() {
  const res = await fetch('/api/user/role')
  const data = await res.json()
  console.log('[ADMIN PAGE] Role response:', data)
  return data
}

async function fetchAdminStats() {
  const res = await fetch('/api/admin/stats')
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch stats')
  }
  return res.json()
}

export default function AdminDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const [redirecting, setRedirecting] = useState(false)

  // Fetch user role
  const {
    data: roleData,
    isLoading: roleLoading,
    error: roleError
  } = useQuery({
    queryKey: ['user-role'],
    queryFn: fetchUserRole,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  })

  // Fetch admin stats only if we know user is admin
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    enabled: roleData?.user?.isAdmin === true,
  })

  // Handle authorization - with proper loading state
  useEffect(() => {
    if (roleLoading) {
      console.log('[ADMIN PAGE] Still loading role...')
      return
    }

    if (roleError) {
      console.error('[ADMIN PAGE] Role error:', roleError)
      return
    }

    if (roleData?.authenticated === false) {
      console.log('[ADMIN PAGE] Not authenticated, redirecting to login')
      setRedirecting(true)
      router.push('/admin/login')
      return
    }

    if (roleData?.user) {
      console.log('[ADMIN PAGE] Role data received:', JSON.stringify(roleData, null, 2))
    }
  }, [roleData, roleLoading, roleError, router])

  // Loading state
  if (roleLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {redirecting ? 'Redirecting...' : 'Verifying admin access...'}
          </p>
        </div>
      </div>
    )
  }

  // Not authorized
  if (!roleData?.user?.isAdmin) {
    return (
      <AccessDeniedPage
        reason="unauthorized"
        message="This administrative portal is exclusively for authorized DuukaAfrica administrators. Your access attempt has been logged and monitored. If you believe this is an error, please contact the system administrator."
      />
    )
  }

  const handleLogout = () => {
    router.push('/admin/login')
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Desktop Sidebar - Hidden on mobile */}
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={sidebarLinks}
        userEmail={roleData?.user?.email}
        isSuperAdmin={roleData?.user?.isSuperAdmin}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu */}
              <MobileNav
                title="DuukaAfrica"
                badge="Admin"
                navItems={sidebarLinks}
                userType="admin"
                userEmail={roleData?.user?.email}
              />
              <h2 className="text-lg md:text-xl font-semibold">Dashboard</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 hidden sm:flex">
                <CheckCircle className="w-3 h-3 mr-1" />
                Admin Access Verified
              </Badge>
              <Badge className="bg-green-500 sm:hidden">
                <CheckCircle className="w-3 h-3" />
              </Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-xl md:text-3xl font-bold">{stats?.users?.total || 0}</p>
                  </div>
                  <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Active Stores</p>
                    <p className="text-xl md:text-3xl font-bold">{stats?.stores?.active || 0}</p>
                  </div>
                  <div className="p-2 md:p-3 bg-green-50 dark:bg-green-950/30 rounded-full">
                    <Store className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Products</p>
                    <p className="text-xl md:text-3xl font-bold">{stats?.products?.total || 0}</p>
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
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                    <p className="text-lg md:text-3xl font-bold">UGX {(stats?.revenue?.total || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2 md:p-3 bg-orange-50 dark:bg-orange-950/30 rounded-full">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-4">
                <Link href="/admin/categories" className="flex items-center justify-between p-2 md:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Layers className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm md:text-base">Manage Categories</p>
                      <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Add, edit, or remove product categories</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link href="/admin/users" className="flex items-center justify-between p-2 md:p-3 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm md:text-base">Manage Users</p>
                      <p className="text-xs md:text-sm text-gray-500 hidden sm:block">View and manage user accounts</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link href="/admin/stores" className="flex items-center justify-between p-2 md:p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Store className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-sm md:text-base">Store Verifications</p>
                      <p className="text-xs md:text-sm text-gray-500 hidden sm:block">{stats?.stores?.pending || 0} stores awaiting approval</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-base md:text-lg">Platform Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                    </div>
                    <p className="font-medium text-sm md:text-base">System Status</p>
                    <p className="text-xs md:text-sm text-green-500">Operational</p>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                    </div>
                    <p className="font-medium text-sm md:text-base">Orders Today</p>
                    <p className="text-xs md:text-sm text-gray-500">{stats?.orders?.today || 0}</p>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
                    </div>
                    <p className="font-medium text-sm md:text-base">Avg Rating</p>
                    <p className="text-xs md:text-sm text-gray-500">4.8</p>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                    </div>
                    <p className="font-medium text-sm md:text-base">Total Orders</p>
                    <p className="text-xs md:text-sm text-gray-500">{stats?.orders?.total || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={sidebarLinks} />
      </main>
    </div>
  )
}
