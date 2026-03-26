'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  Package, 
  CreditCard, 
  MessageSquare, 
  Star, 
  AlertCircle, 
  TrendingDown, 
  Box,
  Loader2,
  Check,
  X
} from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: string | null
  isRead: boolean
  createdAt: string
}

async function fetchNotifications(filter: string) {
  const params = new URLSearchParams()
  if (filter === 'unread') params.append('unreadOnly', 'true')
  params.append('limit', '50')
  
  const res = await fetch(`/api/notifications?${params}`)
  if (!res.ok) throw new Error('Failed to fetch notifications')
  return res.json()
}

async function markAsRead(notificationId?: string) {
  const res = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notificationId ? { notificationId } : { markAllRead: true }),
  })
  if (!res.ok) throw new Error('Failed to mark as read')
  return res.json()
}

function getNotificationIcon(type: string) {
  const icons: Record<string, typeof Package> = {
    ORDER_PLACED: Package,
    ORDER_CONFIRMED: Check,
    ORDER_SHIPPED: Package,
    ORDER_DELIVERED: Check,
    ORDER_CANCELLED: X,
    PAYMENT_RECEIVED: CreditCard,
    PAYMENT_FAILED: AlertCircle,
    NEW_MESSAGE: MessageSquare,
    PRICE_DROP: TrendingDown,
    BACK_IN_STOCK: Box,
    REVIEW_REQUEST: Star,
    PROMOTION: Star,
    SYSTEM: AlertCircle,
  }
  return icons[type] || Bell
}

function getNotificationColor(type: string) {
  const colors: Record<string, string> = {
    ORDER_PLACED: 'bg-blue-500',
    ORDER_CONFIRMED: 'bg-green-500',
    ORDER_SHIPPED: 'bg-orange-500',
    ORDER_DELIVERED: 'bg-green-500',
    ORDER_CANCELLED: 'bg-red-500',
    PAYMENT_RECEIVED: 'bg-green-500',
    PAYMENT_FAILED: 'bg-red-500',
    NEW_MESSAGE: 'bg-purple-500',
    PRICE_DROP: 'bg-yellow-500',
    BACK_IN_STOCK: 'bg-green-500',
    REVIEW_REQUEST: 'bg-yellow-500',
    PROMOTION: 'bg-pink-500',
    SYSTEM: 'bg-gray-500',
  }
  return colors[type] || 'bg-gray-500'
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getNotificationLink(notification: Notification) {
  const data = notification.data ? JSON.parse(notification.data) : {}
  
  switch (notification.type) {
    case 'ORDER_PLACED':
    case 'ORDER_CONFIRMED':
    case 'ORDER_SHIPPED':
    case 'ORDER_DELIVERED':
    case 'ORDER_CANCELLED':
      return '/dashboard/orders'
    case 'NEW_MESSAGE':
      return '/messages'
    case 'REVIEW_REQUEST':
      return '/dashboard/orders'
    default:
      return null
  }
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => fetchNotifications(filter),
  })

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  const handleMarkAllRead = () => {
    markReadMutation.mutate(undefined)
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Stay updated with your orders and activities
              </p>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                onClick={handleMarkAllRead}
                disabled={markReadMutation.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                  <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-medium mb-1">No notifications</h3>
                  <p className="text-sm text-gray-500">
                    {filter === 'unread' 
                      ? "You're all caught up!" 
                      : "You'll be notified about orders, messages, and more here."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification: Notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const iconColor = getNotificationColor(notification.type)
                  const link = getNotificationLink(notification)
                  
                  const content = (
                    <Card 
                      className={`transition-all hover:shadow-md cursor-pointer ${
                        !notification.isRead 
                          ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                          : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-full ${iconColor} flex items-center justify-center shrink-0`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 shrink-0">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-xs text-gray-400">
                                {formatDateTime(notification.createdAt)}
                              </p>
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto py-1 px-2 text-xs"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleNotificationClick(notification)
                                  }}
                                >
                                  Mark as read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )

                  if (link) {
                    return (
                      <Link 
                        key={notification.id} 
                        href={link}
                        onClick={() => handleNotificationClick(notification)}
                        className="block"
                      >
                        {content}
                      </Link>
                    )
                  }

                  return <div key={notification.id} onClick={() => handleNotificationClick(notification)}>{content}</div>
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
