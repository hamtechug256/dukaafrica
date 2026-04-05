'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Menu,
  X,
  Home,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  BarChart3,
  Users,
  Store,
  AlertTriangle,
  Shield,
  Layers,
  Flashlight,
  TrendingUp,
  Heart,
  MapPin,
  Star,
  Clock,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  badge?: number
}

interface MobileNavProps {
  title: string
  badge?: string
  navItems: NavItem[]
  userType: 'buyer' | 'seller' | 'admin'
  userEmail?: string
  showUpgrade?: boolean
  onUpgradeClick?: () => void
}

const iconMap: Record<string, React.ElementType> = {
  Home,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  BarChart3,
  Users,
  Store,
  AlertTriangle,
  Shield,
  Layers,
  Flashlight,
  TrendingUp,
  Heart,
  MapPin,
  Star,
  Clock,
}

export function MobileNav({
  title,
  badge,
  navItems,
  userType,
  userEmail,
  showUpgrade,
  onUpgradeClick,
}: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-orange-500/10 to-green-500/10">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
                {title}
              </SheetTitle>
              {badge && (
                <Badge variant="secondary" className="mt-1">
                  {badge}
                </Badge>
              )}
            </div>
            <UserButton />
          </div>
          {userEmail && (
            <p className="text-sm text-muted-foreground mt-2 truncate">
              {userEmail}
            </p>
          )}
        </SheetHeader>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
                {isActive && <ChevronRight className="h-4 w-4" />}
              </Link>
            )
          })}
        </nav>

        {showUpgrade && (
          <div className="p-4 border-t">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
              onClick={() => {
                setOpen(false)
                onUpgradeClick?.()
              }}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Tier
            </Button>
          </div>
        )}

        <div className="p-4 border-t">
          <Link href="/" onClick={() => setOpen(false)}>
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Bottom Navigation for Mobile
interface BottomNavProps {
  items: NavItem[]
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname()

  // Show max 5 items in bottom nav
  const visibleItems = items.slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 truncate max-w-[60px]">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Desktop Sidebar for Admin
interface DesktopSidebarProps {
  title: string
  badge?: string
  navItems: NavItem[]
  userEmail?: string
  isSuperAdmin?: boolean
  onLogout?: () => void
}

export function DesktopSidebar({
  title,
  badge,
  navItems,
  userEmail,
  isSuperAdmin,
  onLogout,
}: DesktopSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-64 bg-card border-r flex-col h-screen sticky top-0">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            {title}
          </h1>
        </Link>
        {badge && (
          <Badge variant="secondary" className="mt-1">
            {isSuperAdmin ? 'Super Admin' : badge}
          </Badge>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        {userEmail && (
          <div className="flex items-center gap-2 mb-3 px-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground truncate">
              {userEmail}
            </span>
          </div>
        )}
        {onLogout && (
          <Button variant="outline" className="w-full" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Exit Dashboard
          </Button>
        )}
      </div>
    </aside>
  )
}
