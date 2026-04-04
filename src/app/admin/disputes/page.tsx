'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  DollarSign,
  Search,
  Loader2,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

interface Dispute {
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
    orderNumber: string
    total: number
    currency: string
    status: string
    paymentStatus: string
  }
  buyer: {
    id: string
    name: string | null
    email: string
  }
  seller: {
    id: string
    name: string
  }
  store: {
    id: string
    name: string
    slug: string
  }
}

interface DisputeStats {
  open: number
  underReview: number
  resolved: number
  escalated: number
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

const DISPUTE_STATUSES: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-yellow-500' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-500' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-500' },
  ESCALATED: { label: 'Escalated', color: 'bg-red-500' }
}

export default function AdminDisputesPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [stats, setStats] = useState<DisputeStats>({ open: 0, underReview: 0, resolved: 0, escalated: 0 })
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Resolution form
  const [resolutionType, setResolutionType] = useState<'REFUND_BUYER' | 'RELEASE_TO_SELLER' | 'PARTIAL_REFUND'>('REFUND_BUYER')
  const [partialRefundAmount, setPartialRefundAmount] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')

  useEffect(() => {
    fetchDisputes()
  }, [statusFilter, currentPage])

  const fetchDisputes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery })
      })
      
      const res = await fetch(`/api/admin/disputes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDisputes(data.disputes || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setStats(data.stats || { open: 0, underReview: 0, resolved: 0, escalated: 0 })
      }
    } catch (error) {
      console.error('Error fetching disputes:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch disputes' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolveDispute = async () => {
    if (!selectedDispute) return
    
    if (!resolutionNotes.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Resolution notes are required' })
      return
    }

    if (resolutionType === 'PARTIAL_REFUND' && !partialRefundAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'Partial refund amount is required' })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/disputes/${selectedDispute.id}/resolve`, {
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
        setShowResolveDialog(false)
        setSelectedDispute(null)
        setResolutionNotes('')
        setPartialRefundAmount('')
        fetchDisputes()
      } else {
        const data = await res.json()
        toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to resolve dispute' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to resolve dispute' })
    } finally {
      setIsLoading(false)
    }
  }

  const openResolveDialog = (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setResolutionType('REFUND_BUYER')
    setResolutionNotes('')
    setPartialRefundAmount('')
    setShowResolveDialog(true)
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

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      {/* Header */}
      <header className="bg-white dark:bg-[oklch(0.15_0.02_45)] border-b border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.25_0.02_45)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] hover:text-[oklch(0.6_0.2_35)]">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
                  Dispute Management
                </h1>
                <p className="text-sm text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                  Resolve buyer-seller disputes and manage refunds
                </p>
              </div>
            </div>
            <Button onClick={fetchDisputes} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Open</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Under Review</p>
                  <p className="text-2xl font-bold">{stats.underReview}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Escalated</p>
                  <p className="text-2xl font-bold">{stats.escalated}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Resolved</p>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[oklch(0.45_0.02_45)]" />
                  <Input
                    placeholder="Search by order number, buyer, or store..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && fetchDisputes()}
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Disputes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Disputes</CardTitle>
            <CardDescription>
              Review and resolve buyer-seller disputes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[oklch(0.6_0.2_35)]" />
              </div>
            ) : disputes.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">No disputes found</p>
                <p className="text-[oklch(0.45_0.02_45)]">
                  {statusFilter !== 'all' ? `No ${statusFilter.toLowerCase()} disputes` : 'All caught up!'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispute ID</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-mono text-xs">
                        {dispute.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/admin/orders/${dispute.orderId}`}
                          className="text-[oklch(0.6_0.2_35)] hover:underline"
                        >
                          {dispute.order?.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {DISPUTE_REASONS[dispute.reason] || dispute.reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dispute.buyer?.name || 'Unknown'}</p>
                          <p className="text-xs text-[oklch(0.45_0.02_45)]">{dispute.buyer?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dispute.store?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(dispute.order?.total || 0, dispute.order?.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${DISPUTE_STATUSES[dispute.status]?.color || 'bg-gray-500'} text-white`}
                        >
                          {DISPUTE_STATUSES[dispute.status]?.label || dispute.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(dispute.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/disputes/${dispute.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          {dispute.status !== 'RESOLVED' && (
                            <Button 
                              size="sm"
                              onClick={() => openResolveDialog(dispute)}
                              className="bg-[oklch(0.55_0.15_140)] text-white hover:bg-[oklch(0.5_0.14_140)]"
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="py-2 px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Choose how to resolve this dispute. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedDispute && (
              <div className="bg-[oklch(0.96_0.02_85)] dark:bg-[oklch(0.18_0.02_45)] rounded-lg p-4">
                <p className="text-sm text-[oklch(0.45_0.02_45)]">Order</p>
                <p className="font-medium">{selectedDispute.order?.orderNumber}</p>
                <p className="text-sm text-[oklch(0.45_0.02_45)] mt-2">Amount in Escrow</p>
                <p className="font-medium">{formatCurrency(selectedDispute.order?.total || 0)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Resolution Type</Label>
              <Select value={resolutionType} onValueChange={(v: any) => setResolutionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REFUND_BUYER">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Full Refund to Buyer
                    </div>
                  </SelectItem>
                  <SelectItem value="RELEASE_TO_SELLER">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Release to Seller
                    </div>
                  </SelectItem>
                  <SelectItem value="PARTIAL_REFUND">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Partial Refund
                    </div>
                  </SelectItem>
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
                  placeholder="Enter amount to refund buyer"
                />
                <p className="text-xs text-[oklch(0.45_0.02_45)]">
                  Remaining amount will be released to seller
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Resolution Notes *</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain your decision..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolveDispute}
              disabled={isLoading || !resolutionNotes.trim()}
              className="bg-[oklch(0.55_0.15_140)] text-white"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
