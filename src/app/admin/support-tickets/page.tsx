'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems, type NavItem } from '@/lib/admin-nav'
import {
  LifeBuoy,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Send,
  Clock,
  MessageSquare,
  User,
  Mail,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { LifeBuoy as TicketIcon } from 'lucide-react'

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

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'CLOSED', label: 'Closed' },
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
    hour: '2-digit',
    minute: '2-digit',
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

async function updateTicketStatus(id: string, status: string) {
  const res = await fetch(`/api/support-tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update ticket')
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

export default function AdminSupportTicketsPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [statusChange, setStatusChange] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const queryParams: Record<string, string> = {
    page: currentPage.toString(),
    limit: '20',
  }
  if (searchQuery) queryParams.search = searchQuery
  if (filterStatus) queryParams.status = filterStatus
  if (filterCategory) queryParams.category = filterCategory
  if (filterPriority) queryParams.priority = filterPriority

  // Extend admin nav with support tickets
  const extendedNavItems: NavItem[] = [
    ...adminNavItems.slice(0, adminNavItems.length - 1), // all but Settings
    { href: '/admin/support-tickets', icon: TicketIcon, label: 'Support Tickets' },
    adminNavItems[adminNavItems.length - 1], // Settings at end
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support-tickets', queryParams],
    queryFn: () => fetchTickets(queryParams),
    enabled: isLoaded && !!user,
  })

  const { data: ticketDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-ticket-detail', selectedTicketId],
    queryFn: () => fetchTicketDetail(selectedTicketId!),
    enabled: !!selectedTicketId,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTicketStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', selectedTicketId] })
      setStatusChange('')
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      postReply(ticketId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      setReplyMessage('')
    },
  })

  const tickets = data?.tickets || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const ticket = ticketDetail?.ticket

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicketId) return
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyMessage })
  }

  const handleStatusChange = () => {
    if (!statusChange || !selectedTicketId) return
    statusMutation.mutate({ id: selectedTicketId, status: statusChange })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('')
    setFilterCategory('')
    setFilterPriority('')
    setCurrentPage(1)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Detail view
  if (selectedTicketId && ticket) {
    const availableTransitions: Record<string, string[]> = {
      OPEN: ['IN_PROGRESS', 'CLOSED'],
      IN_PROGRESS: ['RESOLVED', 'CLOSED'],
      RESOLVED: ['REOPENED', 'CLOSED'],
      REOPENED: ['IN_PROGRESS', 'CLOSED'],
      CLOSED: [],
    }

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
        <DesktopSidebar
          title="DuukaAfrica"
          badge="Admin"
          navItems={extendedNavItems}
        />
        <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
          <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MobileNav
                  title="DuukaAfrica"
                  badge="Admin"
                  navItems={extendedNavItems}
                  userType="admin"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTicketId(null)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold">Ticket Detail</h2>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    {ticket.id.substring(0, 8)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusStyle(ticket.status)}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityStyle(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main conversation - 3 columns */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Ticket header */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2">
                        <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">
                            {getCategoryLabel(ticket.category || '')}
                          </Badge>
                          <Badge variant="outline">
                            Priority: {ticket.priority}
                          </Badge>
                          {ticket.orderId && (
                            <Badge variant="outline">
                              <Package className="w-3 h-3 mr-1" />
                              {ticket.orderId.substring(0, 8)}...
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Conversation messages */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                    {/* Original message */}
                    <Card className="border-l-4 border-l-[oklch(0.6_0.2_35)]">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-[oklch(0.6_0.2_35)] flex items-center justify-center text-white text-sm font-medium">
                            {ticket.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{ticket.user?.name || 'Unknown User'}</p>
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

                    {/* Replies */}
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
                                  : 'bg-[oklch(0.55_0.15_140)]'
                              }`}
                            >
                              {reply.isAdmin ? 'A' : (reply.user?.name?.charAt(0)?.toUpperCase() || 'U')}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {reply.isAdmin ? 'Support Team (Admin)' : (reply.user?.name || 'User')}
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

                  {/* Reply form */}
                  {ticket.status !== 'CLOSED' && (
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <Label className="mb-2 block">Admin Reply</Label>
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end mt-3">
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
                      </CardContent>
                    </Card>
                  )}

                  {ticket.status === 'CLOSED' && (
                    <div className="text-center py-6 text-gray-500">
                      <p>This ticket has been closed.</p>
                    </div>
                  )}
                </div>

                {/* Sidebar - 1 column */}
                <div className="space-y-4">
                  {/* User info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">User Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{ticket.user?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{ticket.user?.email || 'N/A'}</span>
                      </div>
                      {ticket.orderId && (
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">{ticket.orderId}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          Created: {formatDateShort(ticket.createdAt)}
                        </span>
                      </div>
                      {ticket.resolvedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">
                            Resolved: {formatDateShort(ticket.resolvedAt)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status management */}
                  {ticket.status !== 'CLOSED' && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Status Management</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">Change Status</Label>
                          <Select
                            value={statusChange}
                            onValueChange={setStatusChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select new status" />
                            </SelectTrigger>
                            <SelectContent>
                              {(availableTransitions[ticket.status] || []).map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            className="w-full"
                            size="sm"
                            disabled={!statusChange || statusMutation.isPending}
                            onClick={handleStatusChange}
                          >
                            {statusMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            Update Status
                          </Button>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                          {ticket.status === 'IN_PROGRESS' && (
                            <Button
                              variant="outline"
                              className="w-full text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              size="sm"
                              disabled={statusMutation.isPending}
                              onClick={() => {
                                setStatusChange('RESOLVED')
                                statusMutation.mutate({ id: selectedTicketId, status: 'RESOLVED' })
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Resolve Ticket
                            </Button>
                          )}
                          {ticket.status !== 'CLOSED' && (
                            <Button
                              variant="outline"
                              className="w-full text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                              size="sm"
                              disabled={statusMutation.isPending}
                              onClick={() => {
                                setStatusChange('CLOSED')
                                statusMutation.mutate({ id: selectedTicketId, status: 'CLOSED' })
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Close Ticket
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick stats */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Ticket Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Replies</span>
                        <span className="font-medium">{ticket.TicketReply?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Category</span>
                        <span className="font-medium">{getCategoryLabel(ticket.category || '')}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Priority</span>
                        <Badge className={`text-xs ${getPriorityStyle(ticket.priority)}`}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          <BottomNav items={extendedNavItems} />
        </main>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={extendedNavItems}
      />
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MobileNav
                title="DuukaAfrica"
                badge="Admin"
                navItems={extendedNavItems}
                userType="admin"
              />
              <div>
                <h2 className="text-lg md:text-xl font-semibold">Support Tickets</h2>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Manage customer support requests
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by subject..."
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
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterCategory || 'ALL'}
                  onValueChange={(v) => {
                    setFilterCategory(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterPriority || 'ALL'}
                  onValueChange={(v) => {
                    setFilterPriority(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || filterStatus || filterCategory || filterPriority) && (
                  <Button variant="ghost" onClick={clearFilters} size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tickets table */}
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
                <p className="text-gray-500">
                  {searchQuery || filterStatus || filterCategory || filterPriority
                    ? 'No tickets match your filters.'
                    : 'No support tickets have been created yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Ticket</TableHead>
                        <TableHead className="min-w-[150px]">User</TableHead>
                        <TableHead className="min-w-[200px]">Subject</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                        <TableHead className="hidden md:table-cell">Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
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
                          user: { name: string; email: string } | null
                        }) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-mono text-xs">
                              #{t.id.substring(0, 8)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium truncate max-w-[150px]">
                                  {t.user?.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {t.user?.email || ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm truncate max-w-[200px]">
                                {t.subject}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(t.category || '')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${getPriorityStyle(t.priority)}`}>
                                {t.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${getStatusStyle(t.status)}`}>
                                {t.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-gray-500">
                                {formatDateShort(t.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <MessageSquare className="w-3 h-3" />
                                {t.replyCount}
                                {t.latestReply && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({formatDateShort(t.latestReply.createdAt)})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTicketId(t.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {Math.min((pagination.page - 1) * 20 + 1, pagination.total)}-
                    {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} tickets
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
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: pagination.totalPages },
                        (_, i) => i + 1
                      )
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === pagination.totalPages ||
                            Math.abs(p - currentPage) <= 1
                        )
                        .map((p, idx, arr) => {
                          const showEllipsis =
                            idx > 0 && p - arr[idx - 1] > 1
                          return (
                            <span key={p} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-1 text-gray-400">...</span>
                              )}
                              <Button
                                variant={p === currentPage ? 'default' : 'outline'}
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </Button>
                            </span>
                          )
                        })}
                    </div>
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

        <BottomNav items={extendedNavItems} />
      </main>
    </div>
  )
}
