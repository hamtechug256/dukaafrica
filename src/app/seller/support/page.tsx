'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Loader2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  MessageSquare,
  Clock,
  ArrowLeft,
  Send,
  Store,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'ORDER_PROBLEM', label: 'Order Problem' },
  { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { value: 'STORE_SETTINGS', label: 'Store Settings' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'PRODUCT_QUESTION', label: 'Product Question' },
  { value: 'OTHER', label: 'Other' },
] as const

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
] as const

function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label || value
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    case 'REOPENED':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'LOW':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    case 'NORMAL':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'URGENT':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchTickets(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  const res = await fetch(`/api/support-tickets?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch tickets')
  return res.json()
}

async function fetchTicketDetail(id: string) {
  const res = await fetch(`/api/support-tickets/${id}`)
  if (!res.ok) throw new Error('Failed to fetch ticket detail')
  return res.json()
}

async function createTicket(data: { subject: string; message: string; category: string; priority: string; orderId: string }) {
  const res = await fetch('/api/support-tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create ticket')
  }
  return res.json()
}

async function postReply(ticketId: string, message: string) {
  const res = await fetch(`/api/support-tickets/${ticketId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error('Failed to send reply')
  return res.json()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TicketFormData {
  subject: string
  message: string
  category: string
  priority: string
  orderId: string
}

const defaultFormData: TicketFormData = {
  subject: '',
  message: '',
  category: '',
  priority: 'NORMAL',
  orderId: '',
}

export default function SellerSupportPage() {
  const { user, isLoaded } = useUser()
  const queryClient = useQueryClient()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [formData, setFormData] = useState<TicketFormData>(defaultFormData)
  const [replyMessage, setReplyMessage] = useState('')
  const [createError, setCreateError] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const queryParams: Record<string, string> = {
    page: currentPage.toString(),
    limit: '20',
  }
  if (searchQuery) queryParams.search = searchQuery
  if (filterStatus) queryParams.status = filterStatus

  const { data, isLoading } = useQuery({
    queryKey: ['seller-support-tickets', queryParams],
    queryFn: () => fetchTickets(queryParams),
    enabled: isLoaded && !!user,
  })

  const { data: ticketDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['seller-support-ticket-detail', selectedTicketId],
    queryFn: () => fetchTicketDetail(selectedTicketId!),
    enabled: !!selectedTicketId,
  })

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-support-tickets'] })
      setShowCreateDialog(false)
      setFormData(defaultFormData)
      setCreateError('')
    },
    onError: (err: Error) => {
      setCreateError(err.message)
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      postReply(ticketId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-support-ticket-detail', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['seller-support-tickets'] })
      setReplyMessage('')
    },
  })

  const tickets = data?.tickets || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const ticket = ticketDetail?.ticket

  const handleCreate = () => {
    if (!formData.subject || !formData.message || !formData.category) return
    setCreateError('')
    createMutation.mutate(formData)
  }

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicketId) return
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyMessage })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('')
    setCurrentPage(1)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[oklch(0.55_0.15_140)]" />
      </div>
    )
  }

  // Detail view
  if (selectedTicketId && ticket) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTicketId(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tickets
              </Button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[oklch(0.55_0.15_140)]" />
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className={getStatusStyle(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityStyle(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline">
                            {getCategoryLabel(ticket.category || '')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {formatDate(ticket.createdAt)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <Card className="border-l-4 border-l-[oklch(0.55_0.15_140)]">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.55_0.15_140)] flex items-center justify-center text-white text-sm font-medium">
                          {ticket.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{ticket.user?.name || 'You'}</p>
                          <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                        </div>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Original Message
                        </Badge>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {ticket.message}
                      </p>
                    </CardContent>
                  </Card>

                  {ticket.TicketReply?.map((reply: { id: string; message: string; isAdmin: boolean; createdAt: string; user: { name: string } | null }) => (
                    <Card
                      key={reply.id}
                      className={
                        reply.isAdmin
                          ? 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
                          : 'border-l-4 border-l-gray-300 dark:border-l-gray-600'
                      }
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              reply.isAdmin
                                ? 'bg-green-600'
                                : 'bg-[oklch(0.6_0.2_35)]'
                            }`}
                          >
                            {reply.isAdmin ? 'A' : (reply.user?.name?.charAt(0)?.toUpperCase() || 'U')}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {reply.isAdmin ? 'Support Team' : (reply.user?.name || 'You')}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(reply.createdAt)}</p>
                          </div>
                          {reply.isAdmin && (
                            <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {reply.message}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {ticket.status !== 'CLOSED' && (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-3">
                        <Label htmlFor="seller-reply">Your Reply</Label>
                        <Textarea
                          id="seller-reply"
                          placeholder="Type your reply..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleSendReply}
                            disabled={!replyMessage.trim() || replyMutation.isPending}
                          >
                            {replyMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {ticket.status === 'CLOSED' && (
                  <div className="text-center py-6 text-gray-500">
                    <p>This ticket has been closed. Create a new ticket if you need further assistance.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_85)] dark:bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Store className="w-6 h-6 text-[oklch(0.55_0.15_140)]" />
                Seller Support
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Get help with your store, products, and seller tools
              </p>
            </div>
            <Button
              onClick={() => {
                setFormData(defaultFormData)
                setCreateError('')
                setShowCreateDialog(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search tickets by subject..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filterStatus || 'ALL'}
                  onValueChange={(v) => {
                    setFilterStatus(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="REOPENED">Reopened</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || filterStatus) && (
                  <Button variant="ghost" onClick={clearFilters} size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <LifeBuoy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No support tickets</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || filterStatus
                    ? 'No tickets match your filters. Try adjusting your search.'
                    : 'Need help? Create a ticket and our team will assist you.'}
                </p>
                <Button
                  onClick={() => {
                    setFormData(defaultFormData)
                    setCreateError('')
                    setShowCreateDialog(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {tickets.map(
                  (t: {
                    id: string
                    subject: string
                    category: string
                    priority: string
                    status: string
                    createdAt: string
                    replyCount: number
                    latestReply: { message: string; createdAt: string; isAdmin: boolean } | null
                  }) => (
                    <Card
                      key={t.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {t.subject}
                            </h3>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(t.category || '')}
                              </Badge>
                              <Badge className={`text-xs ${getStatusStyle(t.status)}`}>
                                {t.status.replace('_', ' ')}
                              </Badge>
                              <Badge className={`text-xs ${getPriorityStyle(t.priority)}`}>
                                {t.priority}
                              </Badge>
                            </div>
                            {t.latestReply && (
                              <p className="text-sm text-gray-500 mt-2 truncate">
                                {t.latestReply.isAdmin ? 'Support: ' : 'You: '}
                                {t.latestReply.message}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {t.replyCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDateShort(t.createdAt)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} tickets)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= pagination.totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and our support team will get back to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                {createError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="seller-ticket-subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="seller-ticket-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of your issue"
              />
              <p className="text-xs text-gray-500">
                Minimum 5 characters ({formData.subject.length}/5)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-ticket-order">Order ID (optional)</Label>
              <Input
                id="seller-ticket-order"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                placeholder="Link to an order if relevant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-ticket-message">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="seller-ticket-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe your issue in detail..."
                rows={5}
              />
              <p className="text-xs text-gray-500">
                Minimum 10 characters ({formData.message.length}/10)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.subject ||
                formData.subject.length < 5 ||
                !formData.message ||
                formData.message.length < 10 ||
                !formData.category ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
