'use client'


import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  Eye,
  Star,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useState } from 'react'

async function fetchAnalytics(period: string) {
  const res = await fetch(`/api/seller/analytics?period=${period}`)
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

// Simple bar chart component using CSS
function BarChart({ data, dataKey, title, color = '#059669' }: {
  data: { date: string; [key: string]: any }[]
  dataKey: string
  title: string
  color?: string
}) {
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0), 1)
  
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="flex items-end gap-1 h-40">
        {data.slice(-14).map((item, i) => {
          const value = item[dataKey] || 0
          const height = (value / maxValue) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(height, 2)}%`,
                  backgroundColor: color,
                }}
                title={`${item.date}: ${value.toLocaleString()}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{data.slice(-14)[0]?.date}</span>
        <span>{data.slice(-14)[13]?.date}</span>
      </div>
    </div>
  )
}

export default function SellerAnalyticsPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [period, setPeriod] = useState('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['seller-analytics', period],
    queryFn: () => fetchAnalytics(period),
  })

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const summary = data?.summary
  const chartData = data?.chartData || []
  const topProducts = data?.topProducts || []
  const orderStatusBreakdown = data?.orderStatusBreakdown || []
  const productStats = data?.productStats
  const currency = data?.currency || 'UGX'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Sales Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your store performance and sales trends
              </p>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Revenue */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-2xl font-bold">{currency} {(summary?.totalRevenue || 0).toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {summary?.revenueGrowth >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                        <span className={summary?.revenueGrowth >= 0 ? 'text-green-500 text-sm' : 'text-red-500 text-sm'}>
                          {Math.abs(summary?.revenueGrowth || 0)}% vs previous
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Orders */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Orders</p>
                      <p className="text-2xl font-bold">{summary?.totalOrders || 0}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {summary?.ordersGrowth >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                        <span className={summary?.ordersGrowth >= 0 ? 'text-green-500 text-sm' : 'text-red-500 text-sm'}>
                          {Math.abs(summary?.ordersGrowth || 0)}% vs previous
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <ShoppingCart className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Sold */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Products Sold</p>
                      <p className="text-2xl font-bold">{summary?.totalProductsSold || 0}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Avg. Order Value: {currency} {Math.round(summary?.averageOrderValue || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                      <Package className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Stats */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Views</p>
                      <p className="text-2xl font-bold">{productStats?.totalViews || 0}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {productStats?.avgRating?.toFixed(1) || '0.0'} avg rating
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                      <Eye className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart data={chartData} dataKey="revenue" title={`Revenue (${currency})`} color="#059669" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orders Trend</CardTitle>
                  <CardDescription>Daily orders for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart data={chartData} dataKey="orders" title="Orders" color="#3b82f6" />
                </CardContent>
              </Card>
            </div>

            {/* Top Products & Order Status */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Selling Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Best performing products this period</CardDescription>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No sales data yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topProducts.map((product: any, idx: number) => (
                        <div key={product.productId || idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium line-clamp-1">{product.productName}</p>
                              <p className="text-sm text-gray-500">
                                {product.quantitySold} sold • {product.orderCount} orders
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold">
                            {currency} {product.revenue?.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Breakdown</CardTitle>
                  <CardDescription>Current status of your orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderStatusBreakdown.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No orders yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderStatusBreakdown.map((item: any) => {
                        const statusColors: Record<string, string> = {
                          PENDING: 'bg-yellow-100 text-yellow-700',
                          CONFIRMED: 'bg-blue-100 text-blue-700',
                          PROCESSING: 'bg-purple-100 text-purple-700',
                          SHIPPED: 'bg-indigo-100 text-indigo-700',
                          DELIVERED: 'bg-green-100 text-green-700',
                          CANCELLED: 'bg-red-100 text-red-700',
                        }
                        return (
                          <div key={item.status} className="flex items-center justify-between">
                            <Badge className={statusColors[item.status] || 'bg-gray-100'}>
                              {item.status}
                            </Badge>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inventory Alerts */}
            {productStats && (productStats.outOfStock > 0 || productStats.lowStock > 0) && (
              <Card className="mt-6 border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                    <div>
                      <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                        Inventory Alerts
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-orange-700 dark:text-orange-300">
                        {productStats.outOfStock > 0 && (
                          <p>• {productStats.outOfStock} products are out of stock</p>
                        )}
                        {productStats.lowStock > 0 && (
                          <p>• {productStats.lowStock} products are running low (5 or fewer left)</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="mt-3" asChild>
                        <Link href="/seller/products">Manage Products</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
