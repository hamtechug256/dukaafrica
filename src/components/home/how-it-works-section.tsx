'use client'

import { motion } from 'framer-motion'
import {
  Search,
  Shield,
  Truck,
  CheckCircle,
  Package,
  CreditCard,
  Headphones,
  MapPin,
  Clock,
  RefreshCw,
  Star,
  Users,
  Heart,
  Zap,
  Globe,
  Award,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// Icon map for admin-configurable icons
const ICON_MAP: Record<string, LucideIcon> = {
  Search,
  Shield,
  Truck,
  CheckCircle,
  Package,
  CreditCard,
  Headphones,
  MapPin,
  Clock,
  RefreshCw,
  Star,
  Users,
  Heart,
  Zap,
  Globe,
  Award,
}

interface Step {
  icon: string
  title: string
  description: string
}

async function fetchHomepageSettings() {
  const res = await fetch('/api/homepage/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export function HowItWorksSection() {
  const { data } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: fetchHomepageSettings,
    staleTime: 1000 * 60 * 5,
  })

  const settings = data?.settings
  const howItWorks = settings?.howItWorks
  const isVisible = settings?.sections?.section_how_it_works_visible !== false

  if (!isVisible) return null

  const title: string = howItWorks?.how_it_works_title || 'How DukaAfrica Works'
  const subtitle: string =
    howItWorks?.how_it_works_subtitle || 'Simple, safe, and secure shopping in 4 easy steps'
  const steps: Step[] = howItWorks?.how_it_works_steps || []

  if (steps.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-[oklch(0.15_0.02_45)]">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-4">
            {title}
          </h2>
          <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] max-w-2xl mx-auto text-lg">
            {subtitle}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 lg:gap-8 relative">
          {/* Connecting line (desktop only) */}
          {steps.length > 1 && (
            <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[oklch(0.6_0.2_35/30%)] via-[oklch(0.55_0.15_140/30%)] to-[oklch(0.6_0.2_35/30%)]" />
          )}

          {steps.map((step, index) => {
            const IconComponent = ICON_MAP[step.icon] || CheckCircle

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="relative text-center group"
              >
                {/* Step number */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.05, type: 'spring', stiffness: 200 }}
                  className="relative mx-auto mb-6"
                >
                  {/* Outer ring */}
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_35/10%)] to-[oklch(0.55_0.15_140/10%)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {/* Inner circle with icon */}
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140))`,
                      }}
                    >
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-[oklch(0.2_0.02_45)] shadow-md flex items-center justify-center">
                    <span className="text-sm font-bold text-[oklch(0.6_0.2_35)] dark:text-[oklch(0.75_0.14_80)]">
                      {index + 1}
                    </span>
                  </div>
                </motion.div>

                {/* Content */}
                <h3 className="text-lg font-bold text-[oklch(0.15_0.02_45)] dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] text-sm max-w-[240px] mx-auto leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow (between steps on mobile) */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center mt-6">
                    <svg className="w-6 h-6 text-[oklch(0.6_0.2_35/40%)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
