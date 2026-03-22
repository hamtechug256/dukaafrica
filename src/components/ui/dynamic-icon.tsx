'use client'

import * as LucideIcons from 'lucide-react'
import { ComponentProps } from 'react'

// Map of icon names to Lucide icon components
const iconMap: Record<string, React.ComponentType<ComponentProps<typeof LucideIcons.Home>>> = {
  // Default fallback
  default: LucideIcons.Package,
  
  // Agriculture & Farming
  Wheat: LucideIcons.Wheat,
  Leaf: LucideIcons.Leaf,
  TreeDeciduous: LucideIcons.TreeDeciduous,
  
  // Automotive
  Car: LucideIcons.Car,
  Truck: LucideIcons.Truck,
  Bike: LucideIcons.Bike,
  Bus: LucideIcons.Bus,
  
  // Baby & Kids
  Baby: LucideIcons.Baby,
  ToyBrick: LucideIcons.ToyBrick,
  
  // Beauty
  Sparkles: LucideIcons.Sparkles,
  Scissors: LucideIcons.Scissors,
  Palette: LucideIcons.Palette,
  
  // Books
  BookOpen: LucideIcons.BookOpen,
  Book: LucideIcons.Book,
  GraduationCap: LucideIcons.GraduationCap,
  
  // Electronics
  Smartphone: LucideIcons.Smartphone,
  Laptop: LucideIcons.Laptop,
  Tv: LucideIcons.Tv,
  Headphones: LucideIcons.Headphones,
  Camera: LucideIcons.Camera,
  Monitor: LucideIcons.Monitor,
  Tablet: LucideIcons.Tablet,
  Watch: LucideIcons.Watch,
  Printer: LucideIcons.Printer,
  Speaker: LucideIcons.Speaker,
  
  // Fashion
  Shirt: LucideIcons.Shirt,
  ShoppingBag: LucideIcons.ShoppingBag,
  Glasses: LucideIcons.Glasses,
  Crown: LucideIcons.Crown,
  
  // Food
  Utensils: LucideIcons.Utensils,
  Apple: LucideIcons.Apple,
  Coffee: LucideIcons.Coffee,
  Pizza: LucideIcons.Pizza,
  Cake: LucideIcons.Cake,
  
  // Health
  HeartPulse: LucideIcons.HeartPulse,
  Pill: LucideIcons.Pill,
  Activity: LucideIcons.Activity,
  Stethoscope: LucideIcons.Stethoscope,
  
  // Home
  Home: LucideIcons.Home,
  Sofa: LucideIcons.Sofa,
  Lamp: LucideIcons.Lamp,
  Bed: LucideIcons.Lamp,
  Bath: LucideIcons.Bath,
  
  // Services
  Wrench: LucideIcons.Wrench,
  Hammer: LucideIcons.Hammer,
  Settings: LucideIcons.Settings,
  Building2: LucideIcons.Building2,
  
  // Sports
  Dumbbell: LucideIcons.Dumbbell,
  Trophy: LucideIcons.Trophy,
  Goal: LucideIcons.Goal,
  Basketball: LucideIcons.Circle,
  Football: LucideIcons.Circle,

  // Jobs
  Briefcase: LucideIcons.Briefcase,
  FileText: LucideIcons.FileText,

  // Real Estate
  Building: LucideIcons.Building,
  MapPin: LucideIcons.MapPin,

  // Vehicles
  Motorcycle: LucideIcons.Bike,

  // Generic
  Package: LucideIcons.Package,
  Box: LucideIcons.Box,
  Star: LucideIcons.Star,
  Heart: LucideIcons.Heart,
  Zap: LucideIcons.Zap,
  Gift: LucideIcons.Gift,
  Tag: LucideIcons.Tag,
  Percent: LucideIcons.Percent,
  Layers: LucideIcons.Layers,
  Grid3X3: LucideIcons.Grid3X3,
  ShoppingBasket: LucideIcons.ShoppingBasket,
  Store: LucideIcons.Store,
  User: LucideIcons.User,
  Users: LucideIcons.Users,
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
