/**
 * Shared Admin Navigation Configuration
 *
 * Single source of truth for all admin sidebar links.
 * Import this in every admin page to ensure consistent navigation.
 */

import {
  BarChart3,
  Users,
  Layers,
  Store,
  Package,
  ShoppingCart,
  AlertTriangle,
  Shield,
  Settings,
  FileText,
  Image,
  Tag,
} from 'lucide-react'

export interface NavItem {
  href: string
  icon: any
  label: string
}

export const adminNavItems: NavItem[] = [
  { href: '/admin', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/categories', icon: Layers, label: 'Categories' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/disputes', icon: AlertTriangle, label: 'Disputes' },
  { href: '/admin/escrow', icon: Shield, label: 'Escrow' },
  { href: '/admin/banners', icon: Image, label: 'Banners' },
  { href: '/admin/coupons', icon: Tag, label: 'Coupons' },
  { href: '/admin/documents', icon: FileText, label: 'Documents' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]
