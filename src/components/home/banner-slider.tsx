'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ── Types ──
interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  imageMobile: string | null
  link: string | null
  buttonText: string | null
  badgeText: string | null
  badgeColor: string | null
  overlayStyle: string
  textPosition: string
  position: string
  order: number
}

// ── Badge color presets (Jumia/Konga/Kilimall inspired) ──
const BADGE_COLORS: Record<string, string> = {
  orange: 'linear-gradient(135deg, #FF6B35, #F7931E)',
  red: 'linear-gradient(135deg, #E53E3E, #C53030)',
  green: 'linear-gradient(135deg, #38A169, #2F855A)',
  blue: 'linear-gradient(135deg, #3182CE, #2B6CB0)',
  purple: 'linear-gradient(135deg, #805AD5, #6B46C1)',
}

// ── Overlay styles ──
function getOverlayClasses(style: string, position: string): string {
  const base = 'absolute inset-0 z-10 transition-colors'
  switch (style) {
    case 'light':
      return `${base} bg-gradient-to-r from-white/70 via-white/30 to-transparent`
    case 'gradient':
      return `${base} bg-gradient-to-t from-black/80 via-black/20 to-black/40`
    case 'none':
      return `${base} bg-transparent`
    default: // dark
      return `${base} bg-gradient-to-r from-black/65 via-black/25 to-transparent`
  }
}

// ── Text alignment based on position ──
function getTextClasses(position: string): string {
  switch (position) {
    case 'center':
      return 'items-center text-center'
    case 'right':
      return 'items-end text-right'
    default:
      return 'items-start text-left'
  }
}

// ── Skeleton loader (shimmer effect while banners load) ──
function BannerSkeleton() {
  return (
    <div className="relative w-full h-[200px] sm:h-[320px] md:h-[420px] lg:h-[500px] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
      {/* Shimmer animation */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
        />
      </div>
      {/* Fake text blocks */}
      <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-16 gap-4">
        <div className="w-24 h-6 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
        <div className="w-64 sm:w-96 h-10 rounded-lg bg-gray-300 dark:bg-gray-600 animate-pulse" />
        <div className="w-48 sm:w-72 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="w-32 h-12 rounded-xl bg-gray-300 dark:bg-gray-600 animate-pulse mt-2" />
      </div>
    </div>
  )
}

// ── Single banner slide ──
function BannerSlide({ banner, isActive }: { banner: Banner; isActive: boolean }) {
  const isDark = !['light'].includes(banner.overlayStyle)
  const textColor = isDark ? 'text-white' : 'text-gray-900'
  const subTextColor = isDark ? 'text-white/75' : 'text-gray-600'
  const ctaBg = isDark
    ? 'bg-white text-gray-900 hover:bg-gray-100'
    : 'bg-gray-900 text-white hover:bg-gray-800'
  const ctaGhost = isDark
    ? 'bg-white/15 text-white border border-white/30 hover:bg-white/25'
    : 'bg-gray-900/10 text-gray-900 border border-gray-900/20 hover:bg-gray-900/20'
  const badgeStyle = banner.badgeColor && BADGE_COLORS[banner.badgeColor]
    ? { background: BADGE_COLORS[banner.badgeColor] }
    : { background: BADGE_COLORS.orange }

  const slideContent = (
    <>
      {/* Ken Burns zoom effect on active slide */}
      <motion.img
        src={banner.image}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover hidden sm:block"
        animate={isActive ? { scale: [1, 1.08] } : { scale: 1 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />
      <motion.img
        src={banner.imageMobile || banner.image}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover sm:hidden"
        animate={isActive ? { scale: [1, 1.05] } : { scale: 1 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />

      {/* Overlay */}
      <div className={getOverlayClasses(banner.overlayStyle, banner.textPosition)} />

      {/* Content */}
      <div className={`absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-10 md:px-16 lg:px-20 ${getTextClasses(banner.textPosition)}`}>
        <div className="max-w-lg lg:max-w-xl">

          {/* Promo Badge */}
          {banner.badgeText && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={isActive ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-4"
            >
              <span
                className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold text-white uppercase tracking-wider shadow-lg"
                style={badgeStyle}
              >
                {banner.badgeText}
              </span>
            </motion.div>
          )}

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-2 sm:mb-3 drop-shadow-lg ${textColor}`}
          >
            {banner.title}
          </motion.h2>

          {/* Subtitle */}
          {banner.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className={`text-sm sm:text-base md:text-lg lg:text-xl mb-5 sm:mb-6 hidden sm:block drop-shadow-md max-w-md ${subTextColor} ${
                banner.textPosition === 'center' ? 'mx-auto' : ''
              }`}
            >
              {banner.subtitle}
            </motion.p>
          )}

          {/* CTA Buttons */}
          {banner.buttonText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center gap-3"
              style={banner.textPosition === 'center' ? { justifyContent: 'center' } : banner.textPosition === 'right' ? { justifyContent: 'flex-end' } : {}}
            >
              <span
                className={`inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] ${ctaBg}`}
              >
                {banner.buttonText}
                <ChevronRight className="w-4 h-4" />
              </span>
              {banner.link && (
                <span className={`hidden sm:inline-flex items-center gap-1 px-5 py-2.5 sm:py-3.5 rounded-full font-medium text-sm sm:text-base transition-all duration-300 hover:scale-[1.03] ${ctaGhost}`}>
                  View Deal
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </>
  )

  if (banner.link) {
    return (
      <Link href={banner.link} className="relative block w-full h-full group/banner">
        {slideContent}
      </Link>
    )
  }

  return (
    <div className="relative block w-full h-full group/banner">
      {slideContent}
    </div>
  )
}

// ── Progress bar component ──
function ProgressBar({ active, duration }: { active: boolean; duration: number }) {
  return (
    <motion.div
      className="h-[3px] bg-white/90 rounded-full origin-left"
      initial={{ scaleX: 0 }}
      animate={active ? { scaleX: [0, 1] } : { scaleX: 0 }}
      transition={{
        duration: duration / 1000,
        ease: 'linear',
        repeat: active ? Infinity : 0,
      }}
    />
  )
}

// ── Main Banner Slider ──
export function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const SLIDE_DURATION = 5000

  // Fetch banners
  useEffect(() => {
    async function fetchBanners() {
      try {
        const res = await fetch('/api/banners')
        if (res.ok) {
          const data = await res.json()
          setBanners(data.banners || [])
        }
      } catch {
        // Banners are optional
      } finally {
        setIsLoading(false)
      }
    }
    fetchBanners()
  }, [])

  // Intersection Observer — pause when not in viewport
  useEffect(() => {
    if (!containerRef.current || banners.length <= 1) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsPageVisible(entry.isIntersecting),
      { threshold: 0.25 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [banners.length])

  // Auto-advance with pause on hover / hidden tab / off-screen
  useEffect(() => {
    if (banners.length <= 1 || isPaused || !isPageVisible) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrent((prev) => (prev + 1) % banners.length)
    }, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [banners.length, isPaused, isPageVisible])

  // Keyboard navigation
  useEffect(() => {
    if (banners.length <= 1) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        setDirection(-1)
        setCurrent((prev) => (prev - 1 + banners.length) % banners.length)
      } else if (e.key === 'ArrowRight') {
        setDirection(1)
        setCurrent((prev) => (prev + 1) % banners.length)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [banners.length])

  const navigate = useCallback(
    (dir: number) => {
      setDirection(dir)
      setCurrent((prev) => {
        if (dir === 1) return (prev + 1) % banners.length
        return (prev - 1 + banners.length) % banners.length
      })
    },
    [banners.length]
  )

  // Loading state
  if (isLoading) return <BannerSkeleton />
  if (banners.length === 0) return null

  // Single banner — no slider controls needed
  if (banners.length === 1) {
    return (
      <div className="relative w-full h-[200px] sm:h-[320px] md:h-[420px] lg:h-[500px] overflow-hidden">
        <BannerSlide banner={banners[0]} isActive />
      </div>
    )
  }

  const slideVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? '100%' : '-100%',
    }),
    center: {
      opacity: 1,
      x: '0%',
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? '-100%' : '100%',
    }),
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[200px] sm:h-[320px] md:h-[420px] lg:h-[500px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={banners[current].id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <BannerSlide banner={banners[current]} isActive />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows — desktop only */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-3 sm:left-4 lg:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-all duration-300 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 border border-white/10"
        aria-label="Previous banner"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={() => navigate(1)}
        className="absolute right-3 sm:right-4 lg:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-all duration-300 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 border border-white/10"
        aria-label="Next banner"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Bottom Controls: Dots + Progress */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        {banners.map((b, i) => (
          <div key={b.id} className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => {
                setDirection(i > current ? 1 : -1)
                setCurrent(i)
              }}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 h-2.5 bg-white shadow-lg shadow-white/30'
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
            {/* Progress bar under active dot */}
            {i === current && (
              <ProgressBar active={!isPaused && isPageVisible} duration={SLIDE_DURATION} />
            )}
          </div>
        ))}
      </div>

      {/* Slide counter — desktop only */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 lg:right-8 z-30 hidden sm:flex items-center gap-1.5 text-white/70 text-sm font-medium">
        <span className="text-white font-bold">{current + 1}</span>
        <span>/</span>
        <span>{banners.length}</span>
      </div>
    </div>
  )
}
