'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  Bus, 
  MapPin, 
  XCircle,
  type LucideIcon 
} from 'lucide-react'

export type OrderStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'CANCELLED'

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: LucideIcon
  pulseColor?: string
}

const statusConfig: Record<OrderStatus, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: Clock,
    pulseColor: 'bg-yellow-400',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: CheckCircle,
    pulseColor: 'bg-blue-400',
  },
  PROCESSING: {
    label: 'Processing',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: Package,
    pulseColor: 'bg-purple-400',
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: Truck,
    pulseColor: 'bg-orange-400',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    color: 'text-cyan-700 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    icon: Bus,
    pulseColor: 'bg-cyan-400',
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: MapPin,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: XCircle,
  },
}

interface StatusBadgeProps {
  status: OrderStatus
  showIcon?: boolean
  showPulse?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusBadge({ 
  status, 
  showIcon = true, 
  showPulse = false,
  size = 'md',
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const isActive = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(status)

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border transition-all duration-300',
        config.bgColor,
        config.color,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      <span className="relative flex items-center gap-1.5">
        {showPulse && isActive && config.pulseColor && (
          <span className="relative flex h-2 w-2 mr-1">
            <span 
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.pulseColor
              )} 
            />
            <span 
              className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                config.pulseColor
              )} 
            />
          </span>
        )}
        {showIcon && <Icon className={iconSizes[size]} />}
        {config.label}
      </span>
    </Badge>
  )
}

export { statusConfig }
export type { StatusConfig }
