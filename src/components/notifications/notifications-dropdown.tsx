'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X, Check, Package, CreditCard, MessageSquare, Star, AlertCircle, TrendingDown, Box, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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

async function fetchNotifications() {
  const res = await fetch('/api/notifications?limit=10')
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

function formatTimeAgo(dateString: string) {
  const now = new Date()
  const date = new Date(dateString)
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function getNotificationLink(notification: Notification) {
  const data = notification.data ? JSON.parse(notification.data) : {}
  
  switch (notification.type) {
    case 'ORDER_PLACED':
    case 'ORDER_CONFIRMED':
    case 'ORDER_SHIPPED':
    case 'ORDER_DELIVERED':
    case 'ORDER_CANCELLED':
      return data.orderNumber ? `/dashboard/orders` : null
    case 'NEW_MESSAGE':
      return '/messages'
    case 'REVIEW_REQUEST':
      return data.orderNumber ? `/dashboard/orders` : null
    default:
      return null
  }
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60000,
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
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-auto py-1"
              onClick={handleMarkAllRead}
              disabled={markReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {notifications.map((notification: Notification) => {
                const Icon = getNotificationIcon(notification.type)
                const iconColor = getNotificationColor(notification.type)
                const link = getNotificationLink(notification)
                
                const content = (
                  <div 
                    className={`flex gap-3 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${iconColor} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                )

                if (link) {
                  return (
                    <Link 
                      key={notification.id} 
                      href={link}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {content}
                    </Link>
                  )
                }

                return (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="cursor-pointer"
                  >
                    {content}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        <Separator />
        <Link 
          href="/dashboard/notifications" 
          className="block p-3 text-center text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => setOpen(false)}
        >
          View all notifications
        </Link>
      </PopoverContent>
    </Popover>
  )
}
