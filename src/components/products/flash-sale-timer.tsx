'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Zap } from 'lucide-react'

interface FlashSaleTimerProps {
  endTime: Date | string
  startTime?: Date | string
  showIcon?: boolean
  variant?: 'default' | 'compact' | 'banner'
  onEnd?: () => void
  className?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

// TimeBox component defined outside to avoid creating during render
function TimeBox({ value, label, sizeClasses }: { 
  value: number
  label: string
  sizeClasses: { box: string; text: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`${sizeClasses.box} bg-gradient-to-b from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-lg flex flex-col items-center justify-center shadow-lg`}>
        <span className={sizeClasses.text}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className={sizeClasses.label}>{label}</span>
    </div>
  )
}

export function FlashSaleTimer({ 
  endTime, 
  startTime,
  showIcon = true, 
  variant = 'default',
  onEnd,
  className = ''
}: FlashSaleTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0, 
    total: 0 
  })
  const [isStarted, setIsStarted] = useState(true)

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const start = startTime ? new Date(startTime).getTime() : null

      // Check if sale has started
      if (start && now < start) {
        setIsStarted(false)
        const difference = start - now
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
          total: difference,
        }
      }

      setIsStarted(true)
      const difference = end - now

      if (difference <= 0) {
        onEnd?.()
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        total: difference,
      }
    }

    // Initial calculation
    const initialTime = calculateTimeLeft()
    setTimeLeft(initialTime)

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime, startTime, onEnd])

  if (timeLeft.total <= 0 && isStarted) {
    return null
  }

  // Banner variant - for hero sections
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-3">
        {showIcon && <Zap className="w-5 h-5 animate-pulse" />}
        <span className="font-semibold">
          {isStarted ? 'Flash Sale Ends In:' : 'Flash Sale Starts In:'}
        </span>
        <div className="flex items-center gap-1 font-mono">
          {timeLeft.days > 0 && (
            <>
              <span className="bg-white/20 px-2 py-0.5 rounded">{timeLeft.days}d</span>
              <span>:</span>
            </>
          )}
          <span className="bg-white/20 px-2 py-0.5 rounded">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span>:</span>
          <span className="bg-white/20 px-2 py-0.5 rounded">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span>:</span>
          <span className="bg-white/20 px-2 py-0.5 rounded">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
    )
  }

  // Compact variant - for product cards
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 text-xs font-medium text-red-600 ${className}`}>
        <Clock className="w-3 h-3" />
        <span>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      </div>
    )
  }

  // Default variant - detailed timer
  const sizeClasses = {
    box: 'w-12 h-12 md:w-14 md:h-14',
    text: 'text-lg md:text-xl font-bold text-white',
    label: 'text-xs text-gray-500 mt-1',
  }

  return (
    <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showIcon && (
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-red-600">
                {isStarted ? 'Flash Sale Ends In' : 'Starts In'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {timeLeft.days > 0 && (
              <TimeBox value={timeLeft.days} label="Days" sizeClasses={sizeClasses} />
            )}
            {timeLeft.days > 0 && <span className="text-red-500 font-bold">:</span>}
            <TimeBox value={timeLeft.hours} label="Hrs" sizeClasses={sizeClasses} />
            <span className="text-red-500 font-bold">:</span>
            <TimeBox value={timeLeft.minutes} label="Min" sizeClasses={sizeClasses} />
            <span className="text-red-500 font-bold">:</span>
            <TimeBox value={timeLeft.seconds} label="Sec" sizeClasses={sizeClasses} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Flash Sale Progress Component
interface FlashSaleProgressProps {
  claimed: number
  total: number
  showLabel?: boolean
}

export function FlashSaleProgress({ claimed, total, showLabel = true }: FlashSaleProgressProps) {
  const percentage = total > 0 ? Math.min((claimed / total) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <Progress value={percentage} className="h-2 bg-red-100 [&>div]:bg-red-500" />
      {showLabel && (
        <p className="text-xs text-gray-500">
          {claimed} / {total} sold ({Math.round(percentage)}%)
        </p>
      )}
    </div>
  )
}

// Flash Sale Badge Component
interface FlashSaleBadgeProps {
  discount: number
  size?: 'sm' | 'md' | 'lg'
}

export function FlashSaleBadge({ discount, size = 'md' }: FlashSaleBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <Badge className={`bg-red-500 hover:bg-red-600 text-white ${sizeClasses[size]}`}>
      <Zap className="w-3 h-3 mr-1" />
      {discount}% OFF
    </Badge>
  )
}

// Mini Flash Sale Timer Component - Compact version for product cards
interface FlashSaleTimerMiniProps {
  endTime: Date | string
  className?: string
}

export function FlashSaleTimerMini({ endTime, className = '' }: FlashSaleTimerMiniProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const difference = end - now

      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 }
      }

      return {
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [endTime])

  return (
    <div className={`flex items-center gap-1 text-xs font-medium text-red-600 ${className}`}>
      <Clock className="w-3 h-3" />
      <span className="font-mono">
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  )
}
