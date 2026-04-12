'use client'

import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageUploader } from '@/components/ui/image-uploader'
import {
  Image,
  Plus,
  Loader2,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Eye,
  ImageIcon,
  Type,
  Palette,
  Clock,
  Smartphone,
  Monitor,
  Minus,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'
import { useToast } from '@/hooks/use-toast'

// ─── TypeScript Types ───────────────────────────────────────────────

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
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

interface BannerFormData {
  title: string
  subtitle: string
  image: string
  imageMobile: string
  link: string
  buttonText: string
  badgeText: string
  badgeColor: string
  overlayStyle: string
  textPosition: string
  position: string
  order: number
  isActive: boolean
  startDate: string
  endDate: string
  alwaysActive: boolean
}

// ─── Constants ──────────────────────────────────────────────────────

const BADGE_COLORS = [
  { value: 'orange', label: 'Orange', tw: 'bg-orange-500', ring: 'ring-orange-300' },
  { value: 'red', label: 'Red', tw: 'bg-red-500', ring: 'ring-red-300' },
  { value: 'green', label: 'Green', tw: 'bg-green-500', ring: 'ring-green-300' },
  { value: 'blue', label: 'Blue', tw: 'bg-blue-500', ring: 'ring-blue-300' },
  { value: 'purple', label: 'Purple', tw: 'bg-purple-500', ring: 'ring-purple-300' },
]

const OVERLAY_STYLES = [
  { value: 'dark', label: 'Dark', gradient: 'bg-gradient-to-r from-black/70 via-black/40 to-transparent' },
  { value: 'light', label: 'Light', gradient: 'bg-gradient-to-r from-white/70 via-white/40 to-transparent' },
  { value: 'gradient', label: 'Gradient', gradient: 'bg-gradient-to-r from-black/80 via-black/30 to-transparent' },
  { value: 'none', label: 'None', gradient: '' },
]

const TEXT_POSITIONS = [
  { value: 'left', label: 'Left', align: 'items-start text-left' },
  { value: 'center', label: 'Center', align: 'items-center text-center' },
  { value: 'right', label: 'Right', align: 'items-end text-right' },
]

const EMPTY_FORM: BannerFormData = {
  title: '',
  subtitle: '',
  image: '',
  imageMobile: '',
  link: '',
  buttonText: '',
  badgeText: '',
  badgeColor: 'orange',
  overlayStyle: 'dark',
  textPosition: 'left',
  position: 'HOME_SLIDER',
  order: 0,
  isActive: true,
  startDate: '',
  endDate: '',
  alwaysActive: true,
}

// ─── API Functions ──────────────────────────────────────────────────

async function fetchBanners(): Promise<{ banners: Banner[] }> {
  const res = await fetch('/api/admin/banners')
  if (!res.ok) throw new Error('Failed to fetch banners')
  return res.json()
}

async function createBanner(data: Partial<BannerFormData>): Promise<{ banner: Banner }> {
  const res = await fetch('/api/admin/banners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create banner')
  }
  return res.json()
}

async function updateBanner(data: Record<string, unknown>): Promise<{ banner: Banner }> {
  const res = await fetch('/api/admin/banners', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update banner')
  }
  return res.json()
}

async function deleteBanner(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete banner')
  return res.json()
}

// ─── Helpers ────────────────────────────────────────────────────────

function getBannerStatus(banner: Banner): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string } {
  if (!banner.isActive) {
    return { label: 'Inactive', variant: 'secondary', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
  }
  const now = new Date()
  if (banner.startDate && new Date(banner.startDate) > now) {
    return { label: 'Scheduled', variant: 'outline', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' }
  }
  if (banner.endDate && new Date(banner.endDate) < now) {
    return { label: 'Expired', variant: 'destructive', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' }
  }
  return { label: 'Active', variant: 'default', className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Main Component ─────────────────────────────────────────────────

export default function AdminBannersPage() {
  const { isLoaded } = useUser()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [showDialog, setShowDialog] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState<BannerFormData>({ ...EMPTY_FORM })
  const [activeTab, setActiveTab] = useState('content')

  // ─── Queries & Mutations ────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: fetchBanners,
  })

  const createMutation = useMutation({
    mutationFn: createBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      closeDialog()
      toast({ title: 'Banner created successfully', description: 'Your new hero image is now live.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating banner', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      closeDialog()
      toast({ title: 'Banner updated successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating banner', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      toast({ title: 'Banner deleted', description: 'The hero image has been removed.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting banner', description: error.message, variant: 'destructive' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (banner: Banner) =>
      updateBanner({ id: banner.id, isActive: !banner.isActive }),
    onSuccess: (_data, banner) => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      toast({
        title: banner.isActive ? 'Banner deactivated' : 'Banner activated',
        description: banner.isActive
          ? 'This hero image is no longer visible to shoppers.'
          : 'This hero image is now visible to shoppers.',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Error toggling banner', description: error.message, variant: 'destructive' })
    },
  })

  const banners = data?.banners || []

  // ─── Computed Stats ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date()
    const total = banners.length
    const active = banners.filter(b => {
      if (!b.isActive) return false
      if (b.startDate && new Date(b.startDate) > now) return false
      if (b.endDate && new Date(b.endDate) < now) return false
      return true
    }).length
    const scheduled = banners.filter(b =>
      b.isActive && b.startDate && b.endDate && new Date(b.startDate) > now
    ).length
    return { total, active, scheduled }
  }, [banners])

  // ─── Form Helpers ───────────────────────────────────────────────

  const updateField = useCallback(<K extends keyof BannerFormData>(key: K, value: BannerFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData({ ...EMPTY_FORM })
    setEditingBanner(null)
    setActiveTab('content')
  }, [])

  const closeDialog = useCallback(() => {
    setShowDialog(false)
    resetForm()
  }, [resetForm])

  const openCreate = useCallback(() => {
    resetForm()
    setShowDialog(true)
  }, [resetForm])

  const openEdit = useCallback((banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      image: banner.image,
      imageMobile: banner.imageMobile || '',
      link: banner.link || '',
      buttonText: banner.buttonText || '',
      badgeText: banner.badgeText || '',
      badgeColor: banner.badgeColor || 'orange',
      overlayStyle: banner.overlayStyle || 'dark',
      textPosition: banner.textPosition || 'left',
      position: banner.position || 'HOME_SLIDER',
      order: banner.order,
      isActive: banner.isActive,
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '',
      alwaysActive: !banner.startDate && !banner.endDate,
    })
    setActiveTab('content')
    setShowDialog(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!formData.title.trim() || !formData.image.trim()) return

    const payload: Record<string, unknown> = {
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim() || null,
      image: formData.image.trim(),
      imageMobile: formData.imageMobile.trim() || null,
      link: formData.link.trim() || null,
      buttonText: formData.buttonText.trim() || null,
      badgeText: formData.badgeText.trim() || null,
      badgeColor: formData.badgeColor,
      overlayStyle: formData.overlayStyle,
      textPosition: formData.textPosition,
      position: formData.position,
      order: formData.order,
      startDate: !formData.alwaysActive && formData.startDate ? formData.startDate : null,
      endDate: !formData.alwaysActive && formData.endDate ? formData.endDate : null,
    }

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }, [formData, editingBanner, createMutation, updateMutation])

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isFormValid = formData.title.trim().length > 0 && formData.image.trim().length > 0

  // ─── Overlay preview style for card ─────────────────────────────

  function getOverlayGradient(style: string): string {
    const map: Record<string, string> = {
      dark: 'bg-gradient-to-r from-black/70 via-black/40 to-transparent',
      light: 'bg-gradient-to-r from-white/70 via-white/40 to-transparent',
      gradient: 'bg-gradient-to-r from-black/80 via-black/30 to-transparent',
      none: '',
    }
    return map[style] || map.dark
  }

  function getPosClass(pos: string): string {
    const map: Record<string, string> = {
      left: 'items-start text-left',
      center: 'items-center text-center',
      right: 'items-end text-right',
    }
    return map[pos] || map.left
  }

  // ─── Loading / Auth Guard ───────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={adminNavItems}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <MobileNav
              title="DuukaAfrica"
              badge="Admin"
              navItems={adminNavItems}
              userType="admin"
            />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary hidden sm:block" />
                Hero Images
              </h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                Manage homepage hero banners and promotional sliders
              </p>
            </div>
            <div className="ml-auto">
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Banner</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Stats Bar */}
          {!isLoading && banners.length > 0 && (
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none">{stats.total}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total Banners</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none">{stats.active}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Active</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none">{stats.scheduled}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Scheduled</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading banners...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && banners.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Image className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No hero images yet</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                  Create your first hero banner to showcase promotions, new arrivals, and featured products on the homepage.
                </p>
                <Button onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Banner
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Banner List */}
          {!isLoading && banners.length > 0 && (
            <div className="space-y-4">
              {banners.map((banner: Banner) => {
                const status = getBannerStatus(banner)
                const badgeColorClass = BADGE_COLORS.find(c => c.value === banner.badgeColor)?.tw || 'bg-orange-500'
                const overlayGradient = getOverlayGradient(banner.overlayStyle)
                const textPosClass = getPosClass(banner.textPosition)
                const textColor = banner.overlayStyle === 'light' ? 'text-gray-900' : 'text-white'
                const subTextColor = banner.overlayStyle === 'light' ? 'text-gray-700/80' : 'text-white/80'
                const btnStyle = banner.overlayStyle === 'light'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-900'

                return (
                  <Card
                    key={banner.id}
                    className={`overflow-hidden border-0 shadow-sm transition-all ${
                      !banner.isActive ? 'opacity-60' : 'hover:shadow-md'
                    }`}
                  >
                    {/* Banner Preview - Full Width Slider Look */}
                    <div className="relative aspect-video w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {banner.image ? (
                        <img
                          src={banner.image}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
                          <ImageIcon className="w-12 h-12 text-white/50" />
                        </div>
                      )}

                      {/* Overlay */}
                      {overlayGradient && (
                        <div className={`absolute inset-0 ${overlayGradient}`} />
                      )}

                      {/* Inactive Overlay */}
                      {!banner.isActive && (
                        <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center z-10">
                          <span className="px-4 py-2 bg-black/60 text-white rounded-full text-sm font-semibold backdrop-blur-sm">
                            Inactive
                          </span>
                        </div>
                      )}

                      {/* Content Overlay */}
                      <div className={`absolute inset-0 flex flex-col justify-center px-6 md:px-12 ${textPosClass}`}>
                        {banner.badgeText && (
                          <span className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold text-white mb-2 ${badgeColorClass}`}>
                            {banner.badgeText}
                          </span>
                        )}
                        <h3 className={`text-xl md:text-3xl font-bold ${textColor} drop-shadow-lg leading-tight`}>
                          {banner.title}
                        </h3>
                        {banner.subtitle && (
                          <p className={`text-sm md:text-base ${subTextColor} mt-1 drop-shadow max-w-lg`}>
                            {banner.subtitle}
                          </p>
                        )}
                        {banner.buttonText && (
                          <span className={`inline-flex w-fit mt-3 px-5 py-2 rounded-full text-sm font-semibold ${btnStyle}`}>
                            {banner.buttonText}
                          </span>
                        )}
                      </div>

                      {/* Status Badge - Top Right */}
                      <div className="absolute top-3 right-3 z-20">
                        <Badge className={`${status.className} backdrop-blur-sm border-0 text-xs font-medium`}>
                          {status.label}
                        </Badge>
                      </div>

                      {/* Order Badge - Top Left */}
                      <div className="absolute top-3 left-3 z-20">
                        <Badge variant="secondary" className="backdrop-blur-sm text-xs font-mono">
                          #{banner.order}
                        </Badge>
                      </div>
                    </div>

                    {/* Card Footer - Actions */}
                    <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border-t">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-medium text-sm truncate max-w-[200px] md:max-w-none">
                          {banner.title}
                        </h4>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {banner.position}
                        </span>
                        {(banner.startDate || banner.endDate) && (
                          <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(banner.startDate)}
                            {banner.endDate && ` - ${formatDate(banner.endDate)}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleMutation.mutate(banner)}
                          disabled={toggleMutation.isPending}
                          title={banner.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {toggleMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : banner.isActive ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(banner)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteMutation.mutate(banner.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav items={adminNavItems} />
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Create / Edit Dialog                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl flex items-center gap-2">
              {editingBanner ? (
                <>
                  <Edit className="w-5 h-5" />
                  Edit Banner
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Banner
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="content" className="gap-1.5 text-xs sm:text-sm">
                  <Type className="w-3.5 h-3.5 hidden sm:block" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="images" className="gap-1.5 text-xs sm:text-sm">
                  <ImageIcon className="w-3.5 h-3.5 hidden sm:block" />
                  Images
                </TabsTrigger>
                <TabsTrigger value="style" className="gap-1.5 text-xs sm:text-sm">
                  <Palette className="w-3.5 h-3.5 hidden sm:block" />
                  Style
                </TabsTrigger>
                <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm">
                  <Clock className="w-3.5 h-3.5 hidden sm:block" />
                  Schedule
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* ─── Tab 1: Content ────────────────────────────────── */}
              <TabsContent value="content" className="mt-0 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="banner-title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="banner-title"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g. Mega Electronics Sale"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-subtitle">Subtitle</Label>
                  <Input
                    id="banner-subtitle"
                    value={formData.subtitle}
                    onChange={(e) => updateField('subtitle', e.target.value)}
                    placeholder="e.g. Up to 50% off on all electronics"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="banner-button-text">CTA Button Text</Label>
                    <Input
                      id="banner-button-text"
                      value={formData.buttonText}
                      onChange={(e) => updateField('buttonText', e.target.value)}
                      placeholder="e.g. Shop Now"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner-link">Link URL</Label>
                    <Input
                      id="banner-link"
                      value={formData.link}
                      onChange={(e) => updateField('link', e.target.value)}
                      placeholder="/products, /categories/electronics"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="badge-text">Promo Badge Text</Label>
                  <Input
                    id="badge-text"
                    value={formData.badgeText}
                    onChange={(e) => updateField('badgeText', e.target.value)}
                    placeholder='e.g. "30% OFF", "Flash Sale", "New Arrival"'
                  />
                </div>

                <div className="space-y-2">
                  <Label>Badge Color</Label>
                  <div className="flex items-center gap-3">
                    {BADGE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => updateField('badgeColor', color.value)}
                        className={`w-9 h-9 rounded-full ${color.tw} transition-all ${
                          formData.badgeColor === color.value
                            ? `ring-2 ring-offset-2 ${color.ring} ring-offset-background scale-110`
                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        title={color.label}
                        aria-label={`Select ${color.label} badge color`}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ─── Tab 2: Images ─────────────────────────────────── */}
              <TabsContent value="images" className="mt-0 space-y-6">
                <div className="space-y-2">
                  <Label>Desktop Image <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1920×600px, landscape orientation
                  </p>
                  <ImageUploader
                    value={formData.image}
                    onChange={(url) => updateField('image', url)}
                    folder="duukaafrica/banners"
                    aspectRatio="16/6"
                    placeholder="Upload desktop hero image (1920×600)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mobile Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 800×400px. Falls back to desktop image if not provided.
                  </p>
                  <ImageUploader
                    value={formData.imageMobile}
                    onChange={(url) => updateField('imageMobile', url)}
                    folder="duukaafrica/banners"
                    aspectRatio="2/1"
                    placeholder="Upload mobile hero image (800×400)"
                  />
                </div>

                {/* Live Previews */}
                {(formData.image || formData.title) && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Live Preview
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Desktop Preview */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5" />
                          Desktop
                        </p>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 border shadow-sm">
                          {formData.image ? (
                            <img src={formData.image} alt="Desktop preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
                              <ImageIcon className="w-10 h-10 text-white/50" />
                            </div>
                          )}
                          {OVERLAY_STYLES.find(o => o.value === formData.overlayStyle)?.gradient && (
                            <div className={`absolute inset-0 ${OVERLAY_STYLES.find(o => o.value === formData.overlayStyle)!.gradient}`} />
                          )}
                          <div className={`absolute inset-0 flex flex-col justify-center px-8 ${TEXT_POSITIONS.find(p => p.value === formData.textPosition)?.align || 'items-start text-left'}`}>
                            {formData.badgeText && (
                              <span className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold text-white mb-2 ${BADGE_COLORS.find(c => c.value === formData.badgeColor)?.tw || 'bg-orange-500'}`}>
                                {formData.badgeText}
                              </span>
                            )}
                            <h3 className={`text-2xl font-bold ${formData.overlayStyle === 'light' ? 'text-gray-900' : 'text-white'} drop-shadow-lg`}>
                              {formData.title || 'Banner Title'}
                            </h3>
                            {formData.subtitle && (
                              <p className={`text-sm mt-1 max-w-md ${formData.overlayStyle === 'light' ? 'text-gray-700/80' : 'text-white/80'}`}>
                                {formData.subtitle}
                              </p>
                            )}
                            {formData.buttonText && (
                              <span className={`inline-flex w-fit mt-3 px-5 py-2 rounded-full text-sm font-semibold ${formData.overlayStyle === 'light' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
                                {formData.buttonText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Preview */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          Mobile
                        </p>
                        <div className="mx-auto w-[240px]">
                          <div className="rounded-[16px] overflow-hidden border shadow-sm">
                            {/* Phone frame notch */}
                            <div className="bg-gray-800 dark:bg-gray-950 h-5 flex items-center justify-center">
                              <div className="w-12 h-1.5 bg-gray-700 dark:bg-gray-800 rounded-full" />
                            </div>
                            <div className="relative aspect-video overflow-hidden bg-gray-200 dark:bg-gray-700">
                              {formData.imageMobile ? (
                                <img src={formData.imageMobile} alt="Mobile preview" className="w-full h-full object-cover" />
                              ) : formData.image ? (
                                <img src={formData.image} alt="Mobile preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                                  <ImageIcon className="w-6 h-6 text-white/50" />
                                </div>
                              )}
                              {OVERLAY_STYLES.find(o => o.value === formData.overlayStyle)?.gradient && (
                                <div className={`absolute inset-0 ${OVERLAY_STYLES.find(o => o.value === formData.overlayStyle)!.gradient}`} />
                              )}
                              <div className={`absolute inset-0 flex flex-col justify-center px-4 ${TEXT_POSITIONS.find(p => p.value === formData.textPosition)?.align || 'items-start text-left'}`}>
                                {formData.badgeText && (
                                  <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[9px] font-bold text-white mb-1 ${BADGE_COLORS.find(c => c.value === formData.badgeColor)?.tw || 'bg-orange-500'}`}>
                                    {formData.badgeText}
                                  </span>
                                )}
                                <h3 className={`text-xs font-bold ${formData.overlayStyle === 'light' ? 'text-gray-900' : 'text-white'} drop-shadow leading-tight`}>
                                  {formData.title || 'Banner Title'}
                                </h3>
                                {formData.subtitle && (
                                  <p className={`text-[9px] mt-0.5 ${formData.overlayStyle === 'light' ? 'text-gray-700/80' : 'text-white/80'} line-clamp-2`}>
                                    {formData.subtitle}
                                  </p>
                                )}
                                {formData.buttonText && (
                                  <span className={`inline-flex w-fit mt-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-semibold ${formData.overlayStyle === 'light' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
                                    {formData.buttonText}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Phone frame bottom bar */}
                            <div className="bg-gray-800 dark:bg-gray-950 h-4 flex items-center justify-center">
                              <div className="w-8 h-1 bg-gray-700 dark:bg-gray-800 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Tab 3: Style ──────────────────────────────────── */}
              <TabsContent value="style" className="mt-0 space-y-6">
                {/* Overlay Style Visual Selector */}
                <div className="space-y-3">
                  <Label>Overlay Style</Label>
                  <p className="text-xs text-muted-foreground">Choose how the text overlay appears on the banner image</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {OVERLAY_STYLES.map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => updateField('overlayStyle', style.value)}
                        className={`relative rounded-xl border-2 overflow-hidden transition-all aspect-video ${
                          formData.overlayStyle === style.value
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        {/* Mini background image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500" />
                        {/* Overlay preview */}
                        {style.gradient && (
                          <div className={`absolute inset-0 ${style.gradient}`} />
                        )}
                        {/* Label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            formData.overlayStyle === style.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-black/40 text-white'
                          }`}>
                            {style.label}
                          </span>
                        </div>
                        {/* Check indicator */}
                        {formData.overlayStyle === style.value && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Position Visual Selector */}
                <div className="space-y-3">
                  <Label>Text Position</Label>
                  <p className="text-xs text-muted-foreground">Where the title, subtitle, and CTA appear on the banner</p>
                  <div className="grid grid-cols-3 gap-3">
                    {TEXT_POSITIONS.map((pos) => (
                      <button
                        key={pos.value}
                        type="button"
                        onClick={() => updateField('textPosition', pos.value)}
                        className={`relative rounded-xl border-2 overflow-hidden transition-all aspect-video ${
                          formData.textPosition === pos.value
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-blue-500" />
                        <div className="absolute inset-0 bg-black/40" />
                        <div className={`absolute inset-0 flex flex-col justify-center px-3 ${pos.align}`}>
                          <div className={`w-8 h-1.5 bg-white/90 rounded mb-1 ${
                            pos.value === 'center' ? 'mx-auto' : pos.value === 'right' ? 'ml-auto' : ''
                          }`} />
                          <div className={`w-5 h-1 bg-white/60 rounded ${
                            pos.value === 'center' ? 'mx-auto' : pos.value === 'right' ? 'ml-auto' : ''
                          }`} />
                        </div>
                        {/* Label below */}
                        <div className="absolute bottom-0 inset-x-0 py-1 text-center">
                          <span className={`text-[10px] font-semibold ${
                            formData.textPosition === pos.value
                              ? 'text-primary'
                              : 'text-white/80'
                          }`}>
                            {pos.label}
                          </span>
                        </div>
                        {formData.textPosition === pos.value && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Order */}
                <div className="space-y-2">
                  <Label htmlFor="banner-order">Display Order</Label>
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first. Banners are sorted by order, then by creation date.
                  </p>
                  <div className="flex items-center gap-2 max-w-[200px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => updateField('order', Math.max(0, formData.order - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      id="banner-order"
                      type="number"
                      min={0}
                      value={formData.order}
                      onChange={(e) => updateField('order', parseInt(e.target.value) || 0)}
                      className="text-center h-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => updateField('order', formData.order + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Tab 4: Schedule ───────────────────────────────── */}
              <TabsContent value="schedule" className="mt-0 space-y-5">
                {/* Always Active Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Always Active</Label>
                    <p className="text-xs text-muted-foreground">
                      The banner will be visible immediately and stay active indefinitely.
                    </p>
                  </div>
                  <Switch
                    checked={formData.alwaysActive}
                    onCheckedChange={(checked) => updateField('alwaysActive', checked)}
                  />
                </div>

                {/* Date Pickers (shown when not "Always Active") */}
                {!formData.alwaysActive && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date" className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Start Date
                        </Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => updateField('startDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date" className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          End Date
                        </Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => updateField('endDate', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Schedule Summary */}
                    {(formData.startDate || formData.endDate) && (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-800 dark:text-amber-300">Schedule Summary</p>
                            <p className="text-amber-700 dark:text-amber-400 mt-1">
                              {formData.startDate && formData.endDate ? (
                                <>This banner will be active from <strong>{formatDate(formData.startDate)}</strong> to <strong>{formatDate(formData.endDate)}</strong>.</>
                              ) : formData.startDate ? (
                                <>This banner will become active on <strong>{formatDate(formData.startDate)}</strong> and stay active until manually deactivated.</>
                              ) : (
                                <>This banner is already active and will expire on <strong>{formatDate(formData.endDate)}</strong>.</>
                              )}
                            </p>
                            {formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate) && (
                              <p className="text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                End date is before start date
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive banners are hidden from the storefront slider.
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => updateField('isActive', checked)}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Dialog Footer */}
          <DialogFooter className="px-6 pb-6 pt-2 border-t bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3 w-full">
              <Button variant="outline" onClick={closeDialog} disabled={isSubmitting} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </Button>
            </div>
            {!isFormValid && (formData.title || formData.image) && (
              <p className="text-xs text-red-500 mt-2 text-center sm:text-left w-full">
                {!formData.title.trim() && 'Title is required. '}
                {!formData.image.trim() && 'Desktop image is required.'}
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
