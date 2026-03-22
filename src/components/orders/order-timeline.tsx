'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Package,
  Truck,
  MapPin,
  Clock,
  Phone,
  MapPinned,
  Bus,
  ShoppingBag,
  XCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export interface TimelineStep {
  status: OrderStatus
  title: string
  description: string
  timestamp?: string | Date
  icon: typeof ShoppingBag | typeof CheckCircle | typeof Package | typeof Truck | typeof Bus | typeof MapPin | typeof XCircle
}

interface OrderTimelineProps {
  currentStatus: OrderStatus
  statusHistory?: Array<{
    status: OrderStatus
    timestamp: string | Date
    note?: string
  }>
  estimatedDelivery?: string
}

const statusConfig: Record<OrderStatus, {
  label: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
}> = {
  PENDING: {
    label: 'Order Placed',
    icon: ShoppingBag,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200',
  },
  CONFIRMED: {
    label: 'Confirmed',
    icon: CheckCircle,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Package,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200',
  },
  SHIPPED: {
    label: 'Shipped',
    icon: Truck,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    icon: Bus,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200',
  },
  DELIVERED: {
    label: 'Delivered',
    icon: MapPin,
    color: 'text-green-700',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200',
  },
}

const timelineSteps: TimelineStep[] = [
  {
    status: 'PENDING',
    title: 'Order Placed',
    description: 'Your order has been placed successfully',
    icon: ShoppingBag,
  },
  {
    status: 'CONFIRMED',
    title: 'Order Confirmed',
    description: 'Seller has confirmed your order',
    icon: CheckCircle,
  },
  {
    status: 'PROCESSING',
    title: 'Processing',
    description: 'Your order is being prepared',
    icon: Package,
  },
  {
    status: 'SHIPPED',
    title: 'Shipped',
    description: 'Order is on its way via bus',
    icon: Truck,
  },
  {
    status: 'OUT_FOR_DELIVERY',
    title: 'Out for Delivery',
    description: 'Package is on the bus heading to your city',
    icon: Bus,
  },
  {
    status: 'DELIVERED',
    title: 'Delivered',
    description: 'Package has arrived at pickup location',
    icon: MapPin,
  },
]

const statusOrder: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

export function OrderTimeline({
  currentStatus,
  statusHistory = [],
  estimatedDelivery,
}: OrderTimelineProps) {
  const currentIndex = statusOrder.indexOf(currentStatus)
  const isCancelled = currentStatus === 'CANCELLED'

  const getStepStatus = (stepStatus: OrderStatus): 'completed' | 'current' | 'pending' => {
    if (isCancelled) return 'pending'
    const stepIndex = statusOrder.indexOf(stepStatus)
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  const getStatusTimestamp = (status: OrderStatus): string | undefined => {
    const historyItem = statusHistory.find((h) => h.status === status)
    if (historyItem) {
      return typeof historyItem.timestamp === 'string'
        ? historyItem.timestamp
        : historyItem.timestamp.toISOString()
    }
    return undefined
  }

  return (
    <div className="space-y-0">
      {timelineSteps.map((step, index) => {
        const stepStatus = getStepStatus(step.status)
        const config = statusConfig[step.status]
        const Icon = step.icon
        const timestamp = getStatusTimestamp(step.status)
        const isLast = index === timelineSteps.length - 1

        return (
          <div key={step.status} className="relative">
            {/* Connector line */}
            {!isLast && (
              <div
                className={`absolute left-4 top-10 w-0.5 h-12 ${
                  stepStatus === 'completed'
                    ? 'bg-green-400'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  stepStatus === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : stepStatus === 'current'
                    ? `${config.bgColor} ${config.borderColor} animate-pulse`
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                {stepStatus === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : stepStatus === 'current' ? (
                  <Icon className={`w-4 h-4 ${config.color}`} />
                ) : (
                  <Icon className="w-4 h-4 text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-8">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium ${
                      stepStatus === 'completed'
                        ? 'text-gray-900 dark:text-white'
                        : stepStatus === 'current'
                        ? config.color
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </p>
                  {stepStatus === 'current' && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      Current
                    </Badge>
                  )}
                </div>
                <p
                  className={`text-sm mt-1 ${
                    stepStatus === 'pending' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step.description}
                </p>
                {timestamp && stepStatus !== 'pending' && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {isCancelled && (
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-red-50 dark:bg-red-900/20 border-red-200">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-red-600">Order Cancelled</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This order has been cancelled
              </p>
            </div>
          </div>
        </div>
      )}

      {estimatedDelivery && currentStatus !== 'DELIVERED' && currentStatus !== 'CANCELLED' && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Estimated delivery: {estimatedDelivery}
          </p>
        </div>
      )}
    </div>
  )
}

// Bus Delivery Info Card
export function BusDeliveryCard({
  busCompany,
  busNumberPlate,
  conductorPhone,
  pickupLocation,
  estimatedArrival,
}: {
  busCompany?: string | null
  busNumberPlate?: string | null
  conductorPhone?: string | null
  pickupLocation?: string | null
  estimatedArrival?: string | null
}) {
  if (!busCompany && !busNumberPlate && !conductorPhone && !pickupLocation) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Bus className="w-5 h-5" />
          Bus Delivery Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {busCompany && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Truck className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bus Company</p>
              <p className="font-medium">{busCompany}</p>
            </div>
          </div>
        )}

        {busNumberPlate && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-orange-600 text-xs font-bold"> plate</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bus Number Plate</p>
              <p className="font-medium font-mono">{busNumberPlate}</p>
            </div>
          </div>
        )}

        {conductorPhone && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Phone className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Conductor Phone</p>
              <p className="font-medium">{conductorPhone}</p>
            </div>
            <a
              href={`tel:${conductorPhone}`}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          </div>
        )}

        {pickupLocation && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <MapPinned className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pickup Location</p>
              <p className="font-medium">{pickupLocation}</p>
            </div>
          </div>
        )}

        {estimatedArrival && (
          <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Expected arrival: {estimatedArrival}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Status Badge
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status]

  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      <config.icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}
