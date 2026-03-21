'use client'

import { cn } from '@/lib/utils'
import { 
  ShoppingBag, 
  CheckCircle, 
  Package, 
  Truck, 
  Bus, 
  MapPin,
  type LucideIcon 
} from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

export type TimelineStatus = 
  | 'ORDER_PLACED' 
  | 'CONFIRMED' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED'

interface TimelineStepConfig {
  label: string
  description: string
  icon: LucideIcon
}

const timelineStepConfig: Record<TimelineStatus, TimelineStepConfig> = {
  ORDER_PLACED: {
    label: 'Order Placed',
    description: 'Your order has been placed successfully',
    icon: ShoppingBag,
  },
  CONFIRMED: {
    label: 'Confirmed',
    description: 'Seller has confirmed your order',
    icon: CheckCircle,
  },
  PROCESSING: {
    label: 'Processing',
    description: 'Your order is being prepared',
    icon: Package,
  },
  SHIPPED: {
    label: 'Shipped',
    description: 'Order is on the way via bus',
    icon: Truck,
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    description: 'Package ready for pickup',
    icon: Bus,
  },
  DELIVERED: {
    label: 'Delivered',
    description: 'Package has been delivered',
    icon: MapPin,
  },
}

export interface TimelineStepProps {
  status: TimelineStatus
  timestamp?: Date | null
  isCompleted: boolean
  isCurrent: boolean
  isLast: boolean
  customDescription?: string
}

export function TimelineStep({ 
  status, 
  timestamp, 
  isCompleted, 
  isCurrent,
  isLast,
  customDescription 
}: TimelineStepProps) {
  const config = timelineStepConfig[status]
  const Icon = config.icon

  return (
    <div className="relative flex gap-4">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-5 top-12 w-0.5 h-full -translate-x-1/2">
          <motion.div
            className={cn(
              'w-full h-full rounded-full',
              isCompleted 
                ? 'bg-green-500' 
                : isCurrent 
                  ? 'bg-gradient-to-b from-blue-500 to-gray-200 dark:to-gray-700' 
                  : 'bg-gray-200 dark:bg-gray-700'
            )}
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </div>
      )}

      {/* Step Icon */}
      <motion.div
        className={cn(
          'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
          isCompleted && 'bg-green-500 border-green-500 text-white',
          isCurrent && 'bg-blue-500 border-blue-500 text-white',
          !isCompleted && !isCurrent && 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
        )}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
      >
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
          >
            <CheckCircle className="w-5 h-5" />
          </motion.div>
        ) : isCurrent ? (
          <>
            {/* Pulsing dot for current step */}
            <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30" />
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
          </>
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </motion.div>

      {/* Step Content */}
      <motion.div 
        className="flex-1 pb-8"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <h4 className={cn(
            'font-semibold text-base transition-colors duration-300',
            isCompleted && 'text-green-600 dark:text-green-400',
            isCurrent && 'text-blue-600 dark:text-blue-400',
            !isCompleted && !isCurrent && 'text-gray-400 dark:text-gray-500'
          )}>
            {config.label}
          </h4>
          {timestamp && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              isCompleted && 'text-green-600 bg-green-50 dark:bg-green-900/20',
              isCurrent && 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
              !isCompleted && !isCurrent && 'text-gray-400 bg-gray-50 dark:bg-gray-800'
            )}>
              {format(new Date(timestamp), 'MMM d, yyyy • h:mm a')}
            </span>
          )}
        </div>
        <p className={cn(
          'text-sm mt-1 transition-colors duration-300',
          isCompleted && 'text-gray-600 dark:text-gray-400',
          isCurrent && 'text-gray-700 dark:text-gray-300',
          !isCompleted && !isCurrent && 'text-gray-400 dark:text-gray-500'
        )}>
          {customDescription || config.description}
        </p>
      </motion.div>
    </div>
  )
}

export { timelineStepConfig }
