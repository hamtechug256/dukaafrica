'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  Loader2,
  Upload,
  X,
  Info,
  Clock,
  ShieldCheck
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

async function fetchOrder(id: string) {
  const res = await fetch(`/api/orders/${id}`)
  if (!res.ok) throw new Error('Failed to fetch order')
  return res.json()
}

const DISPUTE_REASONS = [
  { value: 'NON_DELIVERY', label: 'Item Not Received', description: 'You haven\'t received your item after the expected delivery date' },
  { value: 'ITEM_NOT_AS_DESCRIBED', label: 'Item Not As Described', description: 'The item differs significantly from the listing' },
  { value: 'DAMAGED', label: 'Item Damaged', description: 'Item arrived damaged or broken' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Received', description: 'You received a different item than what you ordered' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue', description: 'Item quality is poor or defective' },
  { value: 'COUNTERFEIT', label: 'Counterfeit Item', description: 'Item appears to be a fake or counterfeit' },
  { value: 'PARTIAL_DELIVERY', label: 'Partial Delivery', description: 'Only some items from your order were delivered' },
  { value: 'OTHER', label: 'Other', description: 'Another issue not listed above' },
]

export default function CreateDisputePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.id as string

  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
  })

  const createDisputeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          description,
          evidence: evidenceUrls.length > 0 ? evidenceUrls : null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create dispute')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: 'Dispute Submitted',
        description: 'Your dispute has been submitted. Our team will review it shortly.',
      })
      router.push(`/dashboard/orders/${orderId}`)
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    },
  })

  const addEvidenceUrl = () => {
    if (newEvidenceUrl.trim() && !evidenceUrls.includes(newEvidenceUrl.trim())) {
      setEvidenceUrls([...evidenceUrls, newEvidenceUrl.trim()])
      setNewEvidenceUrl('')
    }
  }

  const removeEvidenceUrl = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index))
  }

  const canSubmit = reason && description.trim().length >= 20

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
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
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

  // Check if order is eligible for dispute
  if (order.paymentStatus !== 'PAID') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-12 h-12 text-yellow-600" />
                <div>
                  <h2 className="text-lg font-semibold">Cannot Create Dispute</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    This order is not eligible for a dispute. Payment must be confirmed first.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/orders" className="block mt-4">
                <Button variant="outline">Back to Orders</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (order.dispute) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Info className="w-12 h-12 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold">Dispute Already Exists</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    A dispute has already been created for this order.
                  </p>
                </div>
              </div>
              <Link href={`/dashboard/orders/${orderId}`} className="block mt-4">
                <Button variant="outline">View Order</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Raise a Dispute
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Order #{order.orderNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">Escrow Protected</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Your payment is held in escrow. Our team will review your dispute and work to resolve it fairly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {order.items?.[0]?.product?.images ? (
                  <img
                    src={JSON.parse(order.items[0].product.images)[0]}
                    alt={order.items[0].productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{order.items?.length || 0} item(s)</p>
                <p className="text-sm text-gray-500">
                  {order.currency} {order.total?.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  Ordered on {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}>
                  {order.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispute Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dispute Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help us resolve your dispute quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reason Select */}
            <div className="space-y-2">
              <Label>Reason for Dispute *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <p className="font-medium">{r.label}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reason && (
                <p className="text-sm text-gray-500 mt-1">
                  {DISPUTE_REASONS.find(r => r.value === reason)?.description}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe your issue in detail. Include what happened, when, and any relevant information..."
                rows={6}
                className={description.length > 0 && description.length < 20 ? 'border-yellow-500' : ''}
              />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Minimum 20 characters required
                </span>
                <span className={description.length >= 20 ? 'text-green-600' : 'text-gray-500'}>
                  {description.length}/20
                </span>
              </div>
            </div>

            {/* Evidence URLs */}
            <div className="space-y-3">
              <Label>Evidence (Optional)</Label>
              <p className="text-sm text-gray-500">
                Add links to photos or documents that support your claim (e.g., photos of damaged items, screenshots of conversations)
              </p>
              
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newEvidenceUrl}
                  onChange={(e) => setNewEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addEvidenceUrl}
                  disabled={!newEvidenceUrl.trim()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {evidenceUrls.length > 0 && (
                <div className="space-y-2 mt-3">
                  {evidenceUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate flex-1"
                      >
                        {url}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeEvidenceUrl(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Notice */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  Typical response time: <strong>24-48 hours</strong>
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createDisputeMutation.mutate()}
                disabled={!canSubmit || createDisputeMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                {createDisputeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Submit Dispute
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
