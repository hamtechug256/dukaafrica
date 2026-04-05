'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Store, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface PulseItem {
  id: string
  type: 'purchase' | 'seller' | 'platform'
  text: string
  icon: typeof ShoppingBag
}

interface TickerConfig {
  ticker_enabled: boolean
  ticker_interval_seconds: number
}

async function fetchHomepageSettings() {
  const res = await fetch('/api/homepage/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

async function fetchTickerData() {
  try {
    const res = await fetch('/api/homepage/ticker')
    if (!res.ok) return { items: [] }
    return res.json()
  } catch {
    return { items: [] }
  }
}

export function LivePulseTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState<PulseItem[]>([])

  const { data: settingsData } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: fetchHomepageSettings,
    staleTime: 1000 * 60 * 5,
  })

  const tickerConfig: TickerConfig = settingsData?.settings?.ticker || {}
  const sectionsConfig = settingsData?.settings?.sections || {}

  const isVisible = sectionsConfig.section_ticker_visible !== false && tickerConfig.ticker_enabled !== false
  const intervalSeconds = tickerConfig.ticker_interval_seconds || 5

  // Fetch ticker items
  const { data: tickerData } = useQuery({
    queryKey: ['homepage-ticker'],
    queryFn: fetchTickerData,
    staleTime: 1000 * 60 * 2, // Refresh every 2 minutes
    enabled: isVisible,
  })

  useEffect(() => {
    if (tickerData?.items?.length > 0) {
      setItems(tickerData.items)
    } else if (isVisible) {
      // Generate platform-level items from settings if no real data yet
      const platform = settingsData?.settings?.ticker
      const generatedItems: PulseItem[] = []

      // Use platform stats to generate items
      const stats = platform?.ticker_template_platform
      if (stats) {
        generatedItems.push({
          id: 'platform-1',
          type: 'platform',
          text: stats.replace('{count}', String(Math.floor(Math.random() * 20) + 5)),
          icon: TrendingUp,
        })
      }

      if (generatedItems.length > 0) {
        setItems(generatedItems)
      }
    }
  }, [tickerData, isVisible])

  // Auto-rotate
  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(items.length, 1))
  }, [items.length])

  useEffect(() => {
    if (!isVisible || items.length === 0) return
    const timer = setInterval(advance, (intervalSeconds || 5) * 1000)
    return () => clearInterval(timer)
  }, [isVisible, items.length, intervalSeconds, advance])

  if (!isVisible || items.length === 0) return null

  const currentItem = items[currentIndex % items.length]
  if (!currentItem) return null

  const IconComponent = currentItem.icon || ShoppingBag

  return (
    <div className="bg-gradient-to-r from-[oklch(0.6_0.2_35)] via-[oklch(0.55_0.18_40)] to-[oklch(0.55_0.15_140)]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3 overflow-hidden">
          {/* Live indicator */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="text-white/90 text-sm font-medium hidden sm:inline">Live</span>
          </div>

          {/* Rotating message */}
          <div className="relative h-6 overflow-hidden flex-1 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.id + '-' + currentIndex}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -24, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="flex items-center gap-2 text-white">
                  <IconComponent className="w-4 h-4 text-white/80 flex-shrink-0" />
                  <span className="text-sm">{currentItem.text}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots indicator */}
          {items.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentIndex % items.length
                      ? 'bg-white w-4'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
