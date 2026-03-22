'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Settings,
  Users,
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  Truck,
  TrendingUp,
  Shield,
  Image as ImageIcon
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

const sidebarLinks = [
  { href: '/admin', icon: TrendingUp, label: 'Dashboard' },
  { href: '/admin/users', icon: Shield, label: 'Users' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/shipping', icon: Truck, label: 'Shipping' },
  { href: '/admin/earnings', icon: DollarSign, label: 'Earnings' },
  { href: '/admin/banners', icon: ImageIcon, label: 'Banners' },
  { href: '/admin/support', icon: MessageSquare, label: 'Support' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

async function fetchTickets(status?: string) {
  const query = status && status !== 'all' ? `?status=${status}` : ''
  const res = await fetch(`/api/support${query}`)
  if (!res.ok) throw new Error('Failed to fetch tickets')
  return res.json()
}

async function updateTicket(data: any) {
  const res = await fetch('/api/support', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update ticket')
  return res.json()
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  OPEN: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: MessageSquare },
  WAITING_CUSTOMER: { color: 'bg-purple-100 text-purple-700', icon: AlertCircle },
  RESOLVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CLOSED: { color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
}

export default function AdminSupportPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [reply, setReply] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', activeTab],
    queryFn: () => fetchTickets(activeTab),
  })

  const updateMutation = useMutation({
    mutationFn: updateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      setReply('')
      toast({ title: 'Ticket updated' })
    },
  })

  const handleStatusChange = (ticketId: string, status: string) => {
    updateMutation.mutate({ ticketId, status })
  }

  const handleReply = () => {
    if (!reply.trim() || !selectedTicket) return
    updateMutation.mutate({
      ticketId: selectedTicket.id,
      reply: reply.trim(),
      isAdminReply: true,
    })
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const tickets = data?.tickets || []

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r hidden md:block">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            DukaAfrica
          </h1>
          <Badge variant="secondary" className="mt-1">Admin</Badge>
        </div>
        <nav className="px-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Support Tickets</h2>
              <p className="text-sm text-gray-500">Manage customer support requests</p>
            </div>
            <Badge variant="outline">
              {tickets.filter((t: any) => t.status === 'OPEN').length} Open
            </Badge>
          </div>
        </header>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="OPEN">Open</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
              <TabsTrigger value="WAITING_CUSTOMER">Waiting</TabsTrigger>
              <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : tickets.length === 0 ? (
                <Card className="text-center py-16">
                  <CardContent>
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No tickets found</h3>
                    <p className="text-gray-500">
                      {activeTab === 'all' ? 'No support tickets yet' : `No ${activeTab.toLowerCase()} tickets`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket: any) => {
                    const conf = statusConfig[ticket.status] || statusConfig.OPEN
                    const Icon = conf.icon

                    return (
                      <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${conf.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{ticket.subject}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {ticket.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {ticket.message}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span>{ticket.user?.name || ticket.user?.email}</span>
                                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                                {ticket._count?.replies > 0 && (
                                  <span>{ticket._count.replies} replies</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={ticket.status}
                                onValueChange={(value) => handleStatusChange(ticket.id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="OPEN">Open</SelectItem>
                                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                  <SelectItem value="WAITING_CUSTOMER">Waiting</SelectItem>
                                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                                  <SelectItem value="CLOSED">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                                View
                              </Button>
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
      </main>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Ticket #{selectedTicket?.id?.slice(0, 8)} • {selectedTicket?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p>{selectedTicket?.message}</p>
            </div>

            {selectedTicket?.replies?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Replies</h4>
                {selectedTicket.replies.map((reply: any) => (
                  <div
                    key={reply.id}
                    className={`p-3 rounded-lg ${
                      reply.isAdmin ? 'bg-blue-50 dark:bg-blue-900/20 ml-8' : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {reply.isAdmin ? 'Support Team' : 'Customer'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                placeholder="Type your reply..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
                <Button onClick={handleReply} disabled={!reply.trim() || updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
