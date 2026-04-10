'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, AlertTriangle, Info, Wrench, Tag } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Announcement {
  id: string
  title: string
  content: string
  type: 'INFO' | 'WARNING' | 'MAINTENANCE' | 'PROMOTION'
  targetAudience: string
  targetCountry: string | null
  createdAt: string
  expiresAt: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'dukaafrica_dismissed_announcements'

function getDismissedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Set()
    return new Set(JSON.parse(stored) as string[])
  } catch {
    return new Set()
  }
}

function saveDismissedId(id: string) {
  try {
    const dismissed = getDismissedIds()
    dismissed.add(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]))
  } catch {
    // Ignore localStorage errors
  }
}

function isExpired(announcement: Announcement): boolean {
  if (!announcement.expiresAt) return false
  return new Date(announcement.expiresAt) < new Date()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Fetch announcements on mount
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements')
      if (!res.ok) return
      const data = await res.json()
      const items: Announcement[] = data.announcements || []
      // Filter out expired
      const active = items.filter((a) => !isExpired(a))
      setAnnouncements(active)
    } catch {
      // Silent fail -- banner is non-critical
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  useEffect(() => {
    const dismissedIds = getDismissedIds()
    setDismissed(dismissedIds)
  }, [])

  // Determine how many are visible (not dismissed, and only MAINTENANCE/WARNING/INFO for banner)
  const bannerAnnouncements = announcements.filter((a) => {
    if (dismissed.has(a.id)) return false
    // Only show MAINTENANCE, WARNING, and INFO types in the banner
    return ['MAINTENANCE', 'WARNING', 'INFO'].includes(a.type)
  })

  useEffect(() => {
    setVisibleCount(bannerAnnouncements.length)
  }, [bannerAnnouncements.length])

  const handleDismiss = (id: string) => {
    saveDismissedId(id)
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  // Auto-hide expired announcements
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncements((prev) => prev.filter((a) => !isExpired(a)))
    }, 60_000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  if (visibleCount === 0) return null

  // Show only the first non-dismissed announcement at a time
  const current = bannerAnnouncements[0]
  if (!current) return null

  return (
    <AnnouncementBannerInner
      announcement={current}
      remaining={bannerAnnouncements.length - 1}
      onDismiss={handleDismiss}
    />
  )
}

// ---------------------------------------------------------------------------
// Inner banner component for a single announcement
// ---------------------------------------------------------------------------

function AnnouncementBannerInner({
  announcement,
  remaining,
  onDismiss,
}: {
  announcement: Announcement
  remaining: number
  onDismiss: (id: string) => void
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const style = getBannerStyle(announcement.type)
  const icon = getBannerIcon(announcement.type)

  return (
    <div
      className={`relative ${style.bg} ${style.border} ${style.text} px-4 py-2.5 sm:px-6`}
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{announcement.title}</p>
            {remaining > 0 && (
              <span className="text-xs opacity-70 flex-shrink-0">
                +{remaining} more
              </span>
            )}
          </div>
          <p className="text-xs opacity-80 truncate hidden sm:block">
            {announcement.content}
          </p>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => {
            onDismiss(announcement.id)
            setDismissed(true)
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function getBannerStyle(type: string) {
  switch (type) {
    case 'MAINTENANCE':
      return {
        bg: 'bg-[oklch(0.95_0.04_300)] dark:bg-[oklch(0.2_0.06_300)]',
        border: 'border-b border-[oklch(0.8_0.06_300)] dark:border-[oklch(0.35_0.06_300)]',
        text: 'text-[oklch(0.25_0.1_300)] dark:text-[oklch(0.85_0.06_300)]',
      }
    case 'WARNING':
      return {
        bg: 'bg-[oklch(0.95_0.06_80)] dark:bg-[oklch(0.2_0.06_60)]',
        border: 'border-b border-[oklch(0.8_0.06_80)] dark:border-[oklch(0.35_0.06_60)]',
        text: 'text-[oklch(0.25_0.15_60)] dark:text-[oklch(0.85_0.06_80)]',
      }
    case 'INFO':
    default:
      return {
        bg: 'bg-[oklch(0.97_0.02_220)] dark:bg-[oklch(0.18_0.03_220)]',
        border: 'border-b border-[oklch(0.9_0.02_220)] dark:border-[oklch(0.3_0.03_220)]',
        text: 'text-[oklch(0.3_0.06_220)] dark:text-[oklch(0.75_0.03_220)]',
      }
  }
}

function getBannerIcon(type: string) {
  switch (type) {
    case 'MAINTENANCE':
      return <Wrench className="w-4 h-4 flex-shrink-0" />
    case 'WARNING':
      return <AlertTriangle className="w-4 h-4 flex-shrink-0" />
    case 'INFO':
    default:
      return <Info className="w-4 h-4 flex-shrink-0" />
  }
}
