'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShoppingBag, 
  Heart, 
  MapPin, 
  Star, 
  Package, 
  Clock,
  CheckCircle,
  Truck,
  Loader2,
  ChevronRight
} from 'lucide-react'

async function fetchUserOrders() {
  const res = await fetch('/api/user/orders')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function fetchUserStats() {
  const res = await fetch('/api/user/stats')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function BuyerDashboardPage() {
  const { user, isLoaded } = useUser()

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders'],
    queryFn: fetchUserOrders,
  })

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStats,
  })

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const orders = ordersData?.orders || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName || 'there'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your orders, wishlist, and account settings
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/orders">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
                    <p className="text-sm text-gray-500">Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/wishlist">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <Heart className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.wishlistCount || 0}</p>
                    <p className="text-sm text-gray-500">Wishlist</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/addresses">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.addresses || 0}</p>
                    <p className="text-sm text-gray-500">Addresses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/reviews">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.reviews || 0}</p>
                    <p className="text-sm text-gray-500">Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Recent Orders
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <Truck className="w-4 h-4 mr-2" />
              Track Order
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Link href="/dashboard/orders">
                  <Button variant="ghost" size="sm">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">No orders yet</p>
                    <Link href="/products">
                      <Button>Start Shopping</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order: any) => (
                      <Link
                        key={order.id}
                        href={`/dashboard/orders/${order.id}`}
                        className="block p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                              {order.items.slice(0, 3).map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 overflow-hidden"
                                >
                                  {item.product?.images ? (
                                    <img
                                      src={JSON.parse(item.product.images)[0]}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-full h-full p-2 text-gray-300" />
                                  )}
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-sm text-gray-500">
                                {order.items.length} item(s) • {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">UGX {order.total.toLocaleString()}</p>
                            <Badge className={statusColors[order.status]}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle>Track Your Order</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-4">
                  Enter your order number to track your shipment
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., DA-ABC123"
                    className="flex-1 px-4 py-2 border rounded-lg"
                  />
                  <Button>Track</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Link href="/dashboard/addresses">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <MapPin className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Addresses</h3>
                  <p className="text-sm text-gray-500">Add or edit delivery addresses</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/wishlist">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold">My Wishlist</h3>
                  <p className="text-sm text-gray-500">View saved products</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/reviews">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold">My Reviews</h3>
                  <p className="text-sm text-gray-500">Manage your product reviews</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
