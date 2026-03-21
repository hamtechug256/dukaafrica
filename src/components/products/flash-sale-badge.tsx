'use client'

import { Badge } from '@/components/ui/badge'
import { Zap, Clock } from 'lucide-react'

interface FlashSaleBadgeProps {
  discount?: number
  variant?: 'default' | 'compact' | 'animated'
  showIcon?: boolean
  className?: string
}

export function FlashSaleBadge({
  discount,
  variant = 'default',
  showIcon = true,
  className = '',
}: FlashSaleBadgeProps) {
  // Compact variant - small badge
  if (variant === 'compact') {
    return (
      <Badge
        className={`
          bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs
          animate-pulse shadow-lg shadow-red-500/30
          ${className}
        `}
      >
        {showIcon && <Zap className="w-3 h-3 mr-1" />}
        FLASH
      </Badge>
    )
  }

  // Animated variant - with glow effect
  if (variant === 'animated') {
    return (
      <div className={`relative inline-flex ${className}`}>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-md blur-sm animate-pulse opacity-75" />
        
        <Badge
          className={`
            relative bg-gradient-to-r from-red-500 to-orange-500
            text-white font-bold gap-1 px-3 py-1
            animate-pulse
          `}
        >
          {showIcon && (
            <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
          )}
          FLASH SALE
          {discount !== undefined && (
            <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-xs">
              -{discount}%
            </span>
          )}
        </Badge>
      </div>
    )
  }

  // Default variant
  return (
    <Badge
      className={`
        bg-gradient-to-r from-red-500 to-orange-500
        text-white font-semibold gap-1
        hover:from-red-600 hover:to-orange-600
        transition-all duration-300
        ${className}
      `}
    >
      {showIcon && <Zap className="w-4 h-4" />}
      FLASH SALE
      {discount !== undefined && (
        <span className="ml-1 text-yellow-200">
          -{discount}%
        </span>
      )}
    </Badge>
  )
}

// Flash Sale Countdown Badge - combines flash sale badge with countdown
interface FlashSaleCountdownBadgeProps {
  endTime: Date | string
  discount?: number
  className?: string
}

export function FlashSaleCountdownBadge({
  endTime,
  discount,
  className = '',
}: FlashSaleCountdownBadgeProps) {
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime
  const now = new Date()
  const totalMs = end.getTime() - now.getTime()

  // Calculate remaining time
  const hours = Math.floor(totalMs / (1000 * 60 * 60))
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }
    return `${minutes}m left`
  }

  if (totalMs <= 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold gap-1 animate-pulse">
        <Zap className="w-3 h-3 fill-yellow-300 text-yellow-300" />
        FLASH SALE
        {discount !== undefined && (
          <span className="ml-0.5 text-yellow-200">-{discount}%</span>
        )}
      </Badge>
      <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-700 dark:text-orange-400">
        <Clock className="w-3 h-3 mr-1" />
        {formatTime()}
      </Badge>
    </div>
  )
}

// Mini flash sale indicator - for product cards
interface MiniFlashSaleBadgeProps {
  discount: number
  className?: string
}

export function MiniFlashSaleBadge({ discount, className = '' }: MiniFlashSaleBadgeProps) {
  return (
    <div
      className={`
        absolute top-2 left-2 z-10
        flex items-center gap-0.5
        bg-gradient-to-r from-red-500 to-orange-500
        text-white text-xs font-bold
        px-2 py-1 rounded
        shadow-lg shadow-red-500/30
        animate-pulse
        ${className}
      `}
    >
      <Zap className="w-3 h-3 fill-yellow-300 text-yellow-300" />
      -{discount}%
    </div>
  )
}
