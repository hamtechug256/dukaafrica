'use client'

import {
  Wheat,
  Leaf,
  TreeDeciduous,
  Car,
  Truck,
  Bike,
  Bus,
  Baby,
  ToyBrick,
  Sparkles,
  Scissors,
  Palette,
  BookOpen,
  Book,
  GraduationCap,
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Camera,
  Monitor,
  Tablet,
  Watch,
  Printer,
  Speaker,
  Shirt,
  ShoppingBag,
  Glasses,
  Crown,
  Utensils,
  Apple,
  Coffee,
  Pizza,
  Cake,
  HeartPulse,
  Pill,
  Activity,
  Stethoscope,
  Home,
  Sofa,
  Lamp,
  Bath,
  Wrench,
  Hammer,
  Settings,
  Building2,
  Dumbbell,
  Trophy,
  Goal,
  Circle,
  Briefcase,
  FileText,
  Building,
  MapPin,
  Package,
  Box,
  Star,
  Heart,
  Zap,
  Gift,
  Tag,
  Percent,
  Layers,
  Grid3X3,
  ShoppingBasket,
  Store,
  User,
  Users,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'

// Map of icon names to Lucide icon components — only import what we use
const iconMap: Record<string, ComponentType<LucideProps>> = {
  default: Package,

  // Agriculture & Farming
  Wheat,
  Leaf,
  TreeDeciduous,

  // Automotive
  Car,
  Truck,
  Bike,
  Bus,

  // Baby & Kids
  Baby,
  ToyBrick,

  // Beauty
  Sparkles,
  Scissors,
  Palette,

  // Books
  BookOpen,
  Book,
  GraduationCap,

  // Electronics
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Camera,
  Monitor,
  Tablet,
  Watch,
  Printer,
  Speaker,

  // Fashion
  Shirt,
  ShoppingBag,
  Glasses,
  Crown,

  // Food
  Utensils,
  Apple,
  Coffee,
  Pizza,
  Cake,

  // Health
  HeartPulse,
  Pill,
  Activity,
  Stethoscope,

  // Home
  Home,
  Sofa,
  Lamp,
  Bath,

  // Services
  Wrench,
  Hammer,
  Settings,
  Building2,

  // Sports
  Dumbbell,
  Trophy,
  Goal,
  Basketball: Circle,
  Football: Circle,

  // Jobs
  Briefcase,
  FileText,

  // Real Estate
  Building,
  MapPin,

  // Vehicles
  Motorcycle: Bike,

  // Generic
  Package,
  Box,
  Star,
  Heart,
  Zap,
  Gift,
  Tag,
  Percent,
  Layers,
  Grid3X3,
  ShoppingBasket,
  Store,
  User,
  Users,
}

interface DynamicIconProps {
  name?: string | null
  className?: string
  size?: number
  fallback?: string
}

export function DynamicIcon({ name, className = '', size = 24, fallback = 'Package' }: DynamicIconProps) {
  const iconName = name || fallback
  const IconComponent = iconMap[iconName] || iconMap[fallback] || iconMap.default

  return <IconComponent className={className} size={size} />
}

// Default emoji fallback for categories without icons
const emojiFallbacks: Record<string, string> = {
  'agriculture-farming': '🌾',
  'automotive': '🚗',
  'baby-kids': '👶',
  'beauty-personal-care': '💄',
  'books-stationery': '📚',
  'electronics': '📱',
  'fashion-clothing': '👗',
  'food-groceries': '🍽️',
  'health-wellness': '💊',
  'home-garden': '🏠',
  'services': '🔧',
  'sports-fitness': '⚽',
  'real-estate': '🏢',
  'jobs': '💼',
  'vehicles': '🚙',
}

export function getCategoryEmoji(slug: string): string {
  return emojiFallbacks[slug] || '📦'
}
