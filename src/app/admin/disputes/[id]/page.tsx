'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  DollarSign,
  User,
  Store,
  Package,
  Send,
  Loader2,
  FileImage
} from 'lucide-react'

interface DisputeDetail {
  id: string
  orderId: string
  storeId: string
  buyerId: string
  sellerId: string
  reason: string
  description: string
  buyerEvidence: string | null
  sellerEvidence: string | null
  status: string
  resolution: string | null
  resolutionNotes: string | null
  refundAmount: number | null
  resolvedAt: string | null
  resolvedBy: string | null
  buyerRespondedAt: string | null
  sellerRespondedAt: string | null
  escalatedAt: string | null
  sellerResponseDeadline: string | null
  createdAt: string
  updatedAt: string
  order: {
    id: string
    orderNumber: string
    total: number
    subtotal: number
    shippingFee: number
    currency: string
    status: string
    paymentStatus: string
    shippingName: string
    shippingPhone: string
    shippingAddress: string
    shippingCity: string
    createdAt: string
  }
  buyer: {
    id: string
    name: string | null
    email: string
    phone: string | null
  }
  seller: {
    id: string
    name: string
    email: string
  }
  store: {
    id: string
    name: string
    slug: string
    verificationTier: string
    deliverySuccessRate: number
    totalOrders: number
    disputedOrders: number
  }
  escrow: {
    id: string
    sellerAmount: number
    platformAmount: number
    status: string
    currency: string
    heldAt: string
  } | null
  messages: Array<{
    id: string
    userId: string
    message: string
    attachments: string | null
    isAdmin: boolean
    isInternal: boolean
    createdAt: string
    user: {
      name: string | null
      email: string
    }
  }>
}

const DISPUTE_REASONS: Record<string, string> = {
  NON_DELIVERY: 'Item Not Received',
  ITEM_NOT_AS_DESCRIBED: 'Item Not As Described',
  DAMAGED: 'Item Damaged',
  WRONG_ITEM: 'Wrong Item Received',
  QUALITY_ISSUE: 'Quality Issue',
  COUNTERFEIT: 'Counterfeit Item',
  PARTIAL_DELIVERY: 'Partial Delivery',
  OTHER: 'Other'
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-500',
  UNDER_REVIEW: 'bg-blue-500',
  RESOLVED: 'bg-green-500',
  ESCALATED: 'bg-red-500'
}

export default function DisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [dispute, setDispute] = useState<DisputeDetail | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  
  // Resolution form
  const [showResolutionForm, setShowResolutionForm] = useState(false)
  const [resolutionType, setResolutionType] = useState<'REFUND_BUYER' | 'RELEASE_TO_SELLER' | 'PARTIAL_REFUND'>('REFUND_BUYER')
  const [partialRefundAmount, setPartialRefundAmount] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    fetchDispute()
  }, [params.id])

  const fetchDispute = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/disputes/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setDispute(data)
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Dispute not found' })
        router.push('/admin/disputes')
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch dispute' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setSendingMessage(true)
    try {
      const res = await fetch(`/api/disputes/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          isInternal: isInternalNote
        })
      })

      if (res.ok) {
        setNewMessage('')
        fetchDispute()
        toast({ title: 'Success', description: 'Message sent' })
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message' })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Resolution notes are required' })
      return
    }

    setResolving(true)
    try {
      const res = await fetch(`/api/admin/disputes/${params.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolutionType,
          resolutionNotes,
          ...(resolutionType === 'PARTIAL_REFUND' && { refundAmount: parseFloat(partialRefundAmount) })
        })
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Dispute resolved successfully' })
        fetchDispute()
        setShowResolutionForm(false)
      } else {
        const data = await res.json()
        toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to resolve' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to resolve dispute' })
    } finally {
      setResolving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'UGX') => {
    return `${currency} ${amount.toLocaleString()}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[oklch(0.6_0.2_35)]" />
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Dispute not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      {/* Header */}
      <header className="bg-white dark:bg-[oklch(0.15_0.02_45)] border-b border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.25_0.02_45)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/disputes" className="flex items-center gap-2 text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] hover:text-[oklch(0.6_0.2_35)]">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
                  Dispute #{dispute.id.slice(0, 8)}
                </h1>
                <p className="text-sm text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                  Order {dispute.order?.orderNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${STATUS_COLORS[dispute.status]} text-white`}>
                {dispute.status}
              </Badge>
              {dispute.status !== 'RESOLVED' && (
                <Button 
                  onClick={() => setShowResolutionForm(true)}
                  className="bg-[oklch(0.55_0.15_140)] text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Dispute Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-[oklch(0.45_0.02_45)]">Reason</p>
                    <Badge variant="outline" className="mt-1">
                      {DISPUTE_REASONS[dispute.reason] || dispute.reason}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-[oklch(0.45_0.02_45)]">Opened</p>
                    <p className="font-medium">{formatDate(dispute.createdAt)}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Description</p>
                  <p className="mt-1">{dispute.description}</p>
                </div>

                {dispute.buyerEvidence && (
                  <div className="mt-4">
                    <p className="text-sm text-[oklch(0.45_0.02_45)] mb-2">Buyer Evidence</p>
                    <div className="grid grid-cols-4 gap-2">
                      {JSON.parse(dispute.buyerEvidence).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-20 object-cover rounded" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {dispute.sellerEvidence && (
                  <div className="mt-4">
                    <p className="text-sm text-[oklch(0.45_0.02_45)] mb-2">Seller Evidence</p>
                    <div className="grid grid-cols-4 gap-2">
                      {JSON.parse(dispute.sellerEvidence).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-20 object-cover rounded" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {dispute.resolution && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">Resolution</p>
                    <p className="font-medium mt-1">{dispute.resolution.replace(/_/g, ' ')}</p>
                    {dispute.resolutionNotes && (
                      <p className="text-sm mt-2">{dispute.resolutionNotes}</p>
                    )}
                    {dispute.resolvedAt && (
                      <p className="text-xs text-[oklch(0.45_0.02_45)] mt-2">
                        Resolved on {formatDate(dispute.resolvedAt)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
                  {dispute.messages?.length === 0 ? (
                    <p className="text-center text-[oklch(0.45_0.02_45)] py-8">No messages yet</p>
                  ) : (
                    dispute.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.isAdmin 
                            ? 'bg-[oklch(0.96_0.02_85)] dark:bg-[oklch(0.18_0.02_45)] ml-8' 
                            : msg.isInternal
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200'
                            : 'bg-white dark:bg-[oklch(0.15_0.02_45)] border mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {msg.isAdmin ? 'Admin' : msg.user?.name || msg.user?.email}
                            </span>
                            {msg.isInternal && (
                              <Badge variant="outline" className="text-xs">Internal Note</Badge>
                            )}
                          </div>
                          <span className="text-xs text-[oklch(0.45_0.02_45)]">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                        {msg.attachments && (
                          <div className="flex gap-2 mt-2">
                            {JSON.parse(msg.attachments).map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt="" className="w-16 h-16 object-cover rounded" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {dispute.status !== 'RESOLVED' && (
                  <div className="space-y-3 pt-4 border-t">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded"
                        />
                        Internal note (not visible to buyer/seller)
                      </label>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Order Number</p>
                  <Link 
                    href={`/admin/orders/${dispute.orderId}`}
                    className="text-[oklch(0.6_0.2_35)] hover:underline font-medium"
                  >
                    {dispute.order?.orderNumber}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Total Amount</p>
                  <p className="font-medium">{formatCurrency(dispute.order?.total || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Order Status</p>
                  <Badge variant="outline">{dispute.order?.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Payment Status</p>
                  <Badge variant="outline">{dispute.order?.paymentStatus}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Escrow Info */}
            {dispute.escrow && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Escrow Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-[oklch(0.45_0.02_45)]">Seller Amount</p>
                    <p className="font-medium text-lg">{formatCurrency(dispute.escrow.sellerAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[oklch(0.45_0.02_45)]">Platform Fee</p>
                    <p className="font-medium">{formatCurrency(dispute.escrow.platformAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[oklch(0.45_0.02_45)]">Status</p>
                    <Badge variant="outline">{dispute.escrow.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Buyer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Buyer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{dispute.buyer?.name || 'Unknown'}</p>
                <p className="text-sm text-[oklch(0.45_0.02_45)]">{dispute.buyer?.email}</p>
                {dispute.buyer?.phone && (
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">{dispute.buyer.phone}</p>
                )}
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Seller
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{dispute.store?.name}</p>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">{dispute.seller?.email}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[oklch(0.45_0.02_45)]">Tier</p>
                    <p className="font-medium">{dispute.store?.verificationTier}</p>
                  </div>
                  <div>
                    <p className="text-[oklch(0.45_0.02_45)]">Success Rate</p>
                    <p className="font-medium">{dispute.store?.deliverySuccessRate?.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[oklch(0.45_0.02_45)]">Total Orders</p>
                    <p className="font-medium">{dispute.store?.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-[oklch(0.45_0.02_45)]">Disputes</p>
                    <p className="font-medium text-red-600">{dispute.store?.disputedOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resolution Form */}
            {showResolutionForm && dispute.status !== 'RESOLVED' && (
              <Card className="border-2 border-[oklch(0.6_0.2_35)]">
                <CardHeader>
                  <CardTitle>Resolve Dispute</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Resolution</Label>
                    <Select value={resolutionType} onValueChange={(v: any) => setResolutionType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REFUND_BUYER">Full Refund to Buyer</SelectItem>
                        <SelectItem value="RELEASE_TO_SELLER">Release to Seller</SelectItem>
                        <SelectItem value="PARTIAL_REFUND">Partial Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {resolutionType === 'PARTIAL_REFUND' && (
                    <div className="space-y-2">
                      <Label>Refund Amount (UGX)</Label>
                      <Input
                        type="number"
                        value={partialRefundAmount}
                        onChange={(e) => setPartialRefundAmount(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Notes *</Label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Explain your decision..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowResolutionForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-[oklch(0.55_0.15_140)] text-white"
                      onClick={handleResolve}
                      disabled={resolving || !resolutionNotes.trim()}
                    >
                      {resolving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
