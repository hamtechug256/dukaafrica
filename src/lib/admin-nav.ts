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
  Award,
  Flag,
  Megaphone,
  LifeBuoy,
  Wallet,
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
  { href: '/admin/payouts', icon: Wallet, label: 'Payouts' },
  { href: '/admin/disputes', icon: AlertTriangle, label: 'Disputes' },
  { href: '/admin/escrow', icon: Shield, label: 'Escrow' },
  { href: '/admin/banners', icon: Image, label: 'Banners' },
  { href: '/admin/coupons', icon: Tag, label: 'Coupons' },
  { href: '/admin/documents', icon: FileText, label: 'Documents' },
  { href: '/admin/tiers', icon: Award, label: 'Tiers' },
  { href: '/admin/moderation', icon: Flag, label: 'Moderation' },
  { href: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { href: '/admin/blog', icon: FileText, label: 'Blog' },
  { href: '/admin/support-tickets', icon: LifeBuoy, label: 'Support Tickets' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]
