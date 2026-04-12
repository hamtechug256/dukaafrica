'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  imageMobile: string | null
  link: string | null
  buttonText: string | null
  position: string
  order: number
}

export function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    async function fetchBanners() {
      try {
        const res = await fetch('/api/banners')
        if (res.ok) {
          const data = await res.json()
          setBanners(data.banners || [])
        }
      } catch {
        // Silently fail — banners are optional
      }
    }
    fetchBanners()
  }, [])

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrent((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  const navigate = useCallback(
    (newDirection: number) => {
      setDirection(newDirection)
      setCurrent((prev) => {
        if (newDirection === 1) return (prev + 1) % banners.length
        return (prev - 1 + banners.length) % banners.length
      })
    },
    [banners.length]
  )

  if (banners.length === 0) return null

  if (banners.length === 1) {
    const banner = banners[0]
    const bannerImage = banner.imageMobile || banner.image
    const content = (
      <div className="relative w-full h-[200px] sm:h-[300px] md:h-[400px] lg:h-[480px] overflow-hidden rounded-2xl mx-4 mt-4">
        {/* Desktop image */}
        <img
          src={banner.image}
          alt={banner.title}
          className="w-full h-full object-cover hidden sm:block"
        />
        {/* Mobile image (or fallback to desktop) */}
        <img
          src={bannerImage}
          alt={banner.title}
          className="w-full h-full object-cover sm:hidden"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        {/* Text */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-16 max-w-xl">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="text-sm sm:text-base md:text-lg text-white/80 mb-4 hidden sm:block drop-shadow-md">
              {banner.subtitle}
            </p>
          )}
          {banner.buttonText && banner.link && (
            <Link href={banner.link}>
              <span className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-colors">
                {banner.buttonText}
              </span>
            </Link>
          )}
        </div>
      </div>
    )

    return banner.link ? <Link href={banner.link}>{content}</Link> : content
  }

  // Multi-banner slider
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  }

  const banner = banners[current]
  const bannerImage = banner.imageMobile || banner.image

  return (
    <div className="relative w-full h-[200px] sm:h-[300px] md:h-[400px] lg:h-[480px] mx-4 mt-4 rounded-2xl overflow-hidden group">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={banner.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <Link href={banner.link || '#'} className="block w-full h-full">
            {/* Desktop image */}
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover hidden sm:block"
            />
            {/* Mobile image (or fallback to desktop) */}
            <img
              src={bannerImage}
              alt={banner.title}
              className="w-full h-full object-cover sm:hidden"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            {/* Text */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-16 max-w-xl">
              <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                {banner.title}
              </h2>
              {banner.subtitle && (
                <p className="text-sm sm:text-base md:text-lg text-white/80 mb-4 hidden sm:block drop-shadow-md">
                  {banner.subtitle}
                </p>
              )}
              {banner.buttonText && (
                <span className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-colors w-fit">
                  {banner.buttonText}
                </span>
              )}
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-opacity opacity-0 group-hover:opacity-100"
        aria-label="Previous banner"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => navigate(1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-opacity opacity-0 group-hover:opacity-100"
        aria-label="Next banner"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((b, i) => (
          <button
            key={b.id}
            onClick={() => {
              setDirection(i > current ? 1 : -1)
              setCurrent(i)
            }}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === current
                ? 'bg-white w-6'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
