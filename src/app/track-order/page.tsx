'use client'

import { useState, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search,
  Package,
  Truck,
  MapPin,
  Phone,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { StatusBadge } from '@/components/orders/status-badge'

async function trackOrder(orderNumber: string, email: string) {
  const res = await fetch(`/api/orders/track?orderNumber=${orderNumber}&email=${encodeURIComponent(email)}`)
  if (!res.ok) throw new Error('Order not found')
  return res.json()
}

function TrackOrderLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

function TrackOrderContent() {
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '')
  const [email, setEmail] = useState('')
  const [searched, setSearched] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['track-order', orderNumber, email],
    queryFn: () => trackOrder(orderNumber, email),
    enabled: false,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (orderNumber && email) {
      setSearched(true)
      refetch()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Track Your Order
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter your order number and email to see the latest status
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g., ORD-2024-001234"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !orderNumber || !email}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Track Order
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <>
            {error ? (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Order Not Found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    We couldn't find an order with that number and email. Please check and try again.
                  </p>
                </CardContent>
              </Card>
            ) : data?.order ? (
              <div className="space-y-6">
                {/* Order Header */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Order Number</p>
                        <p className="text-xl font-bold">{data.order.orderNumber}</p>
                      </div>
                      <StatusBadge status={data.order.status} />
                    </div>
                  </CardContent>
                </Card>

                {/* Status Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Order Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((status, index) => {
                        const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']
                        const currentIndex = statusOrder.indexOf(data.order.status)
                        const isCompleted = index <= currentIndex
                        const isCurrent = status === data.order.status

                        return (
                          <div key={status} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted 
                                ? isCurrent ? 'bg-primary text-white' : 'bg-green-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                            }`}>
                              {isCompleted && !isCurrent ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <span className="text-sm font-medium">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 pt-1">
                              <p className={`font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                {status.replace(/_/g, ' ')}
                              </p>
                              {isCurrent && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Current status
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Bus Delivery Info */}
                {data.order.busCompany && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Delivery Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Bus Company</p>
                          <p className="font-medium">{data.order.busCompany}</p>
                        </div>
                        {data.order.busNumberPlate && (
                          <div>
                            <p className="text-sm text-gray-500">Number Plate</p>
                            <p className="font-medium">{data.order.busNumberPlate}</p>
                          </div>
                        )}
                        {data.order.conductorPhone && (
                          <div>
                            <p className="text-sm text-gray-500">Conductor Phone</p>
                            <p className="font-medium">{data.order.conductorPhone}</p>
                          </div>
                        )}
                        {data.order.pickupLocation && (
                          <div>
                            <p className="text-sm text-gray-500">Pickup Location</p>
                            <p className="font-medium">{data.order.pickupLocation}</p>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠️ <strong>Important:</strong> Please bring a valid ID when collecting your package at the bus terminal.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{data.order.shippingName}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {data.order.shippingAddress}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {data.order.shippingCity}, {data.order.shippingRegion}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{data.order.shippingPhone}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </>
        )}

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Having trouble tracking your order?</p>
          <p className="mt-1">
            Contact us at{' '}
            <a href="mailto:support@duukaafrica.com" className="text-primary hover:underline">
              support@duukaafrica.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<TrackOrderLoading />}>
      <TrackOrderContent />
    </Suspense>
  )
}
