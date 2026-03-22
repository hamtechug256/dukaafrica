'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  HelpCircle,
  MessageSquare,
  Loader2,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  ArrowLeft,
  ChevronRight
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

async function fetchTickets() {
  const res = await fetch('/api/support')
  if (!res.ok) throw new Error('Failed to fetch tickets')
  return res.json()
}

async function createTicket(data: any) {
  const res = await fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create ticket')
  return res.json()
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  OPEN: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: MessageSquare },
  WAITING_CUSTOMER: { color: 'bg-purple-100 text-purple-700', icon: AlertCircle },
  RESOLVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CLOSED: { color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
}

export default function SupportPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'OTHER',
    priority: 'NORMAL',
    orderId: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', activeTab],
    queryFn: () => fetchTickets(),
  })

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      setShowNewTicket(false)
      setNewTicket({ subject: '', message: '', category: 'OTHER', priority: 'NORMAL', orderId: '' })
    },
  })

  const handleSubmit = () => {
    if (!newTicket.subject || !newTicket.message) return
    createMutation.mutate(newTicket)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                Help & Support
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Get help with your orders, account, or other issues
              </p>
            </div>
            <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                  <DialogDescription>
                    Describe your issue and we'll get back to you as soon as possible.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newTicket.category}
                        onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ORDER">Order Issue</SelectItem>
                          <SelectItem value="PAYMENT">Payment Issue</SelectItem>
                          <SelectItem value="PRODUCT">Product Question</SelectItem>
                          <SelectItem value="ACCOUNT">Account Issue</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={newTicket.priority}
                        onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue in detail..."
                      rows={5}
                      value={newTicket.message}
                      onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Submit Ticket
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Help */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Live Chat</h3>
                  <p className="text-sm text-gray-500">Chat with support team</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">FAQs</h3>
                  <p className="text-sm text-gray-500">Common questions answered</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Contact Seller</h3>
                  <p className="text-sm text-gray-500">Message a seller directly</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Your Support Tickets</CardTitle>
            <CardDescription>Track your support requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="OPEN">Open</TabsTrigger>
                <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
                <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <HelpCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No support tickets yet</p>
                    <Button className="mt-4" onClick={() => setShowNewTicket(true)}>
                      Create Your First Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket: any) => {
                      const conf = statusConfig[ticket.status] || statusConfig.OPEN
                      const Icon = conf.icon

                      return (
                        <div
                          key={ticket.id}
                          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          <div className={`p-2 rounded-lg ${conf.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{ticket.subject}</h4>
                              <Badge variant="outline" className="text-xs">
                                {ticket.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                              {ticket.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span>#{ticket.id.slice(0, 8)}</span>
                              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                              {ticket._count?.replies > 0 && (
                                <span>{ticket._count.replies} replies</span>
                              )}
                            </div>
                          </div>
                          <Badge className={conf.color}>{ticket.status.replace('_', ' ')}</Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
