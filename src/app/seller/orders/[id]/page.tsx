'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  User,
  DollarSign,
  Save,
  CheckCircle,
} from 'lucide-react'
import { StatusBadge } from '@/components/orders/status-badge'
import { OrderTimeline } from '@/components/orders/order-timeline'

async function fetchOrder(id: string) {
  const res = await fetch(`/api/seller/orders/${id}`)
  if (!res.ok) throw new Error('Failed to fetch order')
  return res.json()
}

async function updateOrder(id: string, data: any) {
  const res = await fetch(`/api/seller/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update order')
  return res.json()
}

const ORDER_STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmed', description: 'Order confirmed, waiting for processing' },
  { value: 'PROCESSING', label: 'Processing', description: 'Order is being prepared' },
  { value: 'SHIPPED', label: 'Shipped', description: 'Order has been handed to bus' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', description: 'Bus has arrived at destination' },
  { value: 'DELIVERED', label: 'Delivered', description: 'Order has been delivered' },
  { value: 'CANCELLED', label: 'Cancelled', description: 'Order was cancelled' },
]

const BUS_COMPANIES = [
  'Gaaga Bus',
  'Modern Coast',
  'YY Coaches',
  'Jaguar Executive',
  'KK Coaches',
  'Swift Safaris',
  "Queen's Coach",
  'Origin Transport',
  'Kampala Coach',
  'Posta Bus',
]

export default function SellerOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const orderId = params.id as string

  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    status: '',
    busCompany: '',
    busNumberPlate: '',
    conductorPhone: '',
    pickupLocation: '',
    notes: '',
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
  })

  const updateMutation = useMutation({
    mutationFn: (updateData: any) => updateOrder(orderId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] })
      setEditMode(false)
    },
  })

  // Populate form when order data loads
  useEffect(() => {
    if (data?.order) {
      setFormData({
        status: data.order.status || '',
        busCompany: data.order.busCompany || '',
        busNumberPlate: data.order.busNumberPlate || '',
        conductorPhone: data.order.conductorPhone || '',
        pickupLocation: data.order.pickupLocation || '',
        notes: data.order.notes || '',
      })
    }
  }, [data?.order])

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
          <Link href="/seller/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  const order = data.order

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const handleStatusChange = (status: string) => {
    if (status === 'SHIPPED' && !order.busCompany) {
      // Prompt for bus details
      setEditMode(true)
    }
    setFormData(prev => ({ ...prev, status }))
  }

  const canTransitionTo = (targetStatus: string) => {
    const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']
    const currentIndex = statusOrder.indexOf(order.status)
    const targetIndex = statusOrder.indexOf(targetStatus)
    return targetIndex === currentIndex + 1 || targetStatus === 'CANCELLED'
  }

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
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              {!editMode && (
                <Button onClick={() => setEditMode(true)} variant="outline">
                  Edit Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>
                  Progress this order to the next status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <AlertDialog key={status.value}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={order.status === status.value ? "default" : "outline"}
                          disabled={!canTransitionTo(status.value) && order.status !== status.value}
                          size="sm"
                        >
                          {status.label}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Mark as {status.label}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {status.description}
                            {status.value === 'SHIPPED' && (
                              <span className="block mt-2 text-yellow-600">
                                You'll need to provide bus delivery details.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleStatusChange(status.value)}
                            className="bg-primary"
                          >
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bus Delivery Form */}
            {(editMode || order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="w-5 h-5" />
                    Bus Delivery Details
                  </CardTitle>
                  <CardDescription>
                    Enter the bus information for this delivery
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bus Company *</Label>
                      <Select
                        value={formData.busCompany}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, busCompany: value }))}
                        disabled={!editMode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bus company" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUS_COMPANIES.map((company) => (
                            <SelectItem key={company} value={company}>
                              {company}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Other (specify in notes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number Plate</Label>
                      <Input
                        value={formData.busNumberPlate}
                        onChange={(e) => setFormData(prev => ({ ...prev, busNumberPlate: e.target.value }))}
                        placeholder="e.g., UAK 123F"
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor Phone</Label>
                      <Input
                        value={formData.conductorPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, conductorPhone: e.target.value }))}
                        placeholder="+256 7XX XXX XXX"
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pickup Location</Label>
                      <Input
                        value={formData.pickupLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                        placeholder="Bus terminal name"
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional delivery notes..."
                      rows={3}
                      disabled={!editMode}
                    />
                  </div>
                  {editMode && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
                          href={`/seller/products/${item.product?.id}`}
                          className="font-medium hover:text-primary line-clamp-2"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          Qty: {item.quantity} × {order.currency} {item.price.toLocaleString()}
                        </p>
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
            {/* Buyer Contact */}
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <User className="w-5 h-5" />
                  Buyer Contact
                </CardTitle>
                <CardDescription className="text-yellow-700 dark:text-yellow-300">
                  Contact buyer to coordinate delivery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium">{order.shippingName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-yellow-600" />
                  <a href={`tel:${order.shippingPhone}`} className="text-blue-600 hover:underline">
                    {order.shippingPhone}
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p>{order.shippingAddress}</p>
                    <p>{order.shippingCity}, {order.shippingRegion}</p>
                    <p>{order.shippingCountry}</p>
                  </div>
                </div>
                <Button asChild className="w-full mt-2" variant="outline">
                  <a href={`tel:${order.shippingPhone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Buyer
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Earnings
                </CardTitle>
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
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{order.currency} {order.total?.toLocaleString()}</span>
                </div>
                {order.sellerProductEarnings && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your Earnings:
                    </p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      {order.currency} {order.sellerProductEarnings?.toLocaleString()}
                    </p>
                  </div>
                )}
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
          </div>
        </div>
      </div>
    </div>
  )
}
