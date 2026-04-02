'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Clock,
  Loader2,
  AlertCircle,
  Bus,
  CheckCircle,
  Camera,
  AlertTriangle,
} from 'lucide-react'
import { StatusBadge } from '@/components/orders/status-badge'
import { OrderTimeline } from '@/components/orders/order-timeline'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

async function fetchOrder(id: string) {
  const res = await fetch(`/api/orders/${id}`)
  if (!res.ok) throw new Error('Failed to fetch order')
  return res.json()
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const orderId = params.id as string
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
  })

  const confirmDeliveryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryPhotoUrl: deliveryPhoto }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to confirm delivery')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      toast({
        title: 'Delivery Confirmed!',
        description: 'Thank you for confirming. Funds have been released to the seller.',
      })
      setShowConfirmDialog(false)
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    },
  })

  const canConfirmDelivery = data?.order && 
    data.isBuyer && 
    ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(data.order.status) &&
    data.order.paymentStatus === 'PAID' &&
    !data.order.deliveryConfirmedAt

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-4">The order you're looking for doesn't exist.</p>
          <Link href="/dashboard/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  const order = data.order

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Order #{order.orderNumber}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Order Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline 
                  currentStatus={order.status} 
                  estimatedDelivery={order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : undefined}
                  statusHistory={[
                    { status: 'PENDING' as const, timestamp: order.createdAt },
                    ...(order.shippedAt ? [{ status: 'SHIPPED' as const, timestamp: order.shippedAt }] : []),
                    ...(order.deliveredAt ? [{ status: 'DELIVERED' as const, timestamp: order.deliveredAt }] : []),
                    ...(order.deliveryConfirmedAt ? [{ status: 'DELIVERED' as const, timestamp: order.deliveryConfirmedAt }] : []),
                    ...(order.cancelledAt ? [{ status: 'CANCELLED' as const, timestamp: order.cancelledAt }] : []),
                  ]}
                />
              </CardContent>
            </Card>

            {/* Bus Delivery Info */}
            {order.busCompany && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="w-5 h-5" />
                    Bus Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Bus Company</p>
                      <p className="font-medium">{order.busCompany}</p>
                    </div>
                    {order.busNumberPlate && (
                      <div>
                        <p className="text-sm text-gray-500">Number Plate</p>
                        <p className="font-medium">{order.busNumberPlate}</p>
                      </div>
                    )}
                    {order.conductorPhone && (
                      <div>
                        <p className="text-sm text-gray-500">Conductor Phone</p>
                        <p className="font-medium">{order.conductorPhone}</p>
                      </div>
                    )}
                    {order.pickupLocation && (
                      <div>
                        <p className="text-sm text-gray-500">Pickup Location</p>
                        <p className="font-medium">{order.pickupLocation}</p>
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

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Items ({order.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
                        {item.product?.images ? (
                          <img
                            src={JSON.parse(item.product.images)[0]}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/products/${item.product?.slug || '#'}`}
                          className="font-medium hover:text-primary line-clamp-2"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          Qty: {item.quantity} × {order.currency} {item.price.toLocaleString()}
                        </p>
                        {item.product?.store && (
                          <Link 
                            href={`/stores/${item.product.store.slug}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {item.product.store.name}
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {order.currency} {(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{order.currency} {order.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span>{order.currency} {order.shippingFee?.toLocaleString()}</span>
                </div>
                {order.couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({order.couponCode})</span>
                    <span>-{order.currency} {order.couponDiscount?.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{order.currency} {order.total?.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{order.shippingName}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {order.shippingAddress}
                  {order.shippingAddress2 && <><br />{order.shippingAddress2}</>}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {order.shippingCity}, {order.shippingRegion}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {order.shippingCountry}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{order.shippingPhone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span>{order.paymentMethod || 'Mobile Money'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              {/* Delivery Confirmation - Only for buyers with shipped orders */}
              {canConfirmDelivery && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowConfirmDialog(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Delivery
                </Button>
              )}
              
              {/* Already confirmed badge */}
              {data.order?.deliveryConfirmedAt && (
                <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Delivery Confirmed</p>
                        <p className="text-sm">
                          {new Date(data.order.deliveryConfirmedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Raise Dispute Button */}
              {data.isBuyer && 
               data.order?.paymentStatus === 'PAID' && 
               !data.order?.dispute && 
               data.order?.escrowStatus === 'HELD' && (
                <Link href={`/dashboard/orders/${orderId}/dispute`} className="block">
                  <Button variant="destructive" className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Raise a Dispute
                  </Button>
                </Link>
              )}
              
              <Link href={`/track-order?order=${order.orderNumber}`} className="block">
                <Button variant="outline" className="w-full">
                  <Truck className="w-4 h-4 mr-2" />
                  Track Order
                </Button>
              </Link>
              <Link href={`/messages?store=${order.store?.id}`} className="block">
                <Button variant="outline" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Seller
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delivery Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Confirm Delivery
            </DialogTitle>
            <DialogDescription>
              By confirming delivery, you acknowledge that you have received your order in good condition. 
              This will release the payment to the seller.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Important</p>
                  <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                    Only confirm if you have received and inspected your package. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Order Summary</p>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Order #{order.orderNumber}</p>
                <p className="font-bold mt-1">{order.currency} {order.total?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => confirmDeliveryMutation.mutate()}
              disabled={confirmDeliveryMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {confirmDeliveryMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Yes, Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
