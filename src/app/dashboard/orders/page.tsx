'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShoppingBag, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  Loader2,
  ChevronRight,
  Eye
} from 'lucide-react'
import { useState } from 'react'

async function fetchOrders(status?: string) {
  const url = status ? `/api/user/orders?status=${status}` : '/api/user/orders'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
  CONFIRMED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Confirmed' },
  PROCESSING: { color: 'bg-purple-100 text-purple-700', icon: Package, label: 'Processing' },
  SHIPPED: { color: 'bg-indigo-100 text-indigo-700', icon: Truck, label: 'Shipped' },
  OUT_FOR_DELIVERY: { color: 'bg-cyan-100 text-cyan-700', icon: Truck, label: 'Out for Delivery' },
  DELIVERED: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Delivered' },
  CANCELLED: { color: 'bg-red-100 text-red-700', icon: Package, label: 'Cancelled' },
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('all')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-orders', activeTab],
    queryFn: () => fetchOrders(activeTab === 'all' ? undefined : activeTab),
  })

  const orders = data?.orders || []

  const tabs = [
    { value: 'all', label: 'All Orders' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            My Orders
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage your orders
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              </div>
            ) : orders.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No orders found</h2>
                  <p className="text-gray-500 mb-4">
                    {activeTab === 'all'
                      ? "You haven't placed any orders yet"
                      : `No ${activeTab.toLowerCase()} orders`}
                  </p>
                  <Link href="/products">
                    <Button>Start Shopping</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => {
                  const config = statusConfig[order.status] || statusConfig.PENDING
                  const StatusIcon = config.icon

                  return (
                    <Card key={order.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Order Header */}
                        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-sm text-gray-500">Order Number</p>
                              <p className="font-semibold">{order.orderNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="font-medium">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Total</p>
                              <p className="font-semibold">{order.currency || 'UGX'} {order.total.toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge className={config.color}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        {/* Order Items */}
                        <div className="p-6">
                          <div className="flex flex-wrap gap-4 mb-4">
                            {(order.OrderItem || []).slice(0, 4).map((item: any, idx: number) => {
                              let itemImage: string | null = null
                              try {
                                const imgs = item.Product?.images ? JSON.parse(item.Product.images) : null
                                if (Array.isArray(imgs) && imgs.length > 0) itemImage = imgs[0]
                              } catch { /* ignore invalid JSON */ }
                              if (!itemImage && item.productImage) itemImage = item.productImage

                              return (
                              <div key={idx} className="flex items-center gap-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                                  {itemImage ? (
                                    <img
                                      src={itemImage}
                                      alt={item.productName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="w-6 h-6 text-gray-300" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                  <p className="text-sm font-semibold">{order.currency || 'UGX'} {Number(item.total || 0).toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                            {(order.OrderItem || []).length > 4 && (
                              <div className="text-sm text-gray-500 self-center">
                                +{(order.OrderItem || []).length - 4} more items
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </Link>
                            {order.status === 'SHIPPED' && order.trackingNumber && (
                              <Button variant="outline" size="sm">
                                <Truck className="w-4 h-4 mr-2" />
                                Track Shipment
                              </Button>
                            )}
                            {order.status === 'DELIVERED' && (
                              <Link href={`/dashboard/reviews?orderId=${order.id}`}>
                                <Button variant="outline" size="sm">
                                  Write Review
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
