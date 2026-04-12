'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Image,
  Plus,
  Loader2,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Link as LinkIcon,
  Tag,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
} from 'lucide-react'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'
import { useToast } from '@/hooks/use-toast'

async function fetchBanners() {
  const res = await fetch('/api/admin/banners')
  if (!res.ok) throw new Error('Failed to fetch banners')
  return res.json()
}

async function createBanner(data: any) {
  const res = await fetch('/api/admin/banners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create banner')
  return res.json()
}

async function updateBanner(data: any) {
  const res = await fetch('/api/admin/banners', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to update banner (${res.status})`)
  }
  return res.json()
}

async function deleteBanner(id: string) {
  const res = await fetch(`/api/admin/banners?id=${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete banner')
  return res.json()
}

const BADGE_COLORS = [
  { value: 'orange', label: 'Orange', preview: 'bg-orange-500' },
  { value: 'red', label: 'Red', preview: 'bg-red-500' },
  { value: 'green', label: 'Green', preview: 'bg-green-500' },
  { value: 'blue', label: 'Blue', preview: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', preview: 'bg-purple-500' },
]

export default function AdminBannersPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [editingBanner, setEditingBanner] = useState<any>(null)
  const [formData, setFormData] = useState({
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
    startDate: '',
    endDate: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: fetchBanners,
  })

  const createMutation = useMutation({
    mutationFn: createBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      setShowDialog(false)
      resetForm()
      toast({ title: 'Banner created successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating banner', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      setShowDialog(false)
      resetForm()
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
      toast({ title: 'Banner deleted' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting banner', description: error.message, variant: 'destructive' })
    },
  })

  const banners = data?.banners || []

  const resetForm = () => {
    setFormData({
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
      startDate: '',
      endDate: '',
    })
    setEditingBanner(null)
  }

  const handleEdit = (banner: any) => {
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
      position: banner.position,
      order: banner.order,
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '',
    })
    setShowDialog(true)
  }

  const handleSubmit = () => {
    const data = {
      ...formData,
      order: parseInt(formData.order.toString()) || 0,
    }

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const toggleActive = (banner: any) => {
    updateMutation.mutate({
      id: banner.id,
      isActive: !banner.isActive,
    })
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={adminNavItems}
      />

      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <MobileNav
              title="DuukaAfrica"
              badge="Admin"
              navItems={adminNavItems}
              userType="admin"
            />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold">Banner Management</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Manage homepage banners and promotional sliders</p>
            </div>
            <div className="ml-auto">
              <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Banner
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : banners.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Image className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No banners yet</h3>
                <p className="text-gray-500 mb-4">Create your first banner to enhance your homepage</p>
                <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Banner
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {banners.map((banner: any) => (
                <Card key={banner.id} className={`overflow-hidden ${banner.isActive ? '' : 'opacity-60'}`}>
                  {/* Preview bar */}
                  <div className="h-40 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden">
                    {banner.image ? (
                      <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    ) : null}
                    {banner.badgeText && (
                      <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${BADGE_COLORS.find(c => c.value === banner.badgeColor)?.preview || 'bg-orange-500'}`}>
                          {banner.badgeText}
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate">{banner.title}</h3>
                          {banner.badgeText && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">{banner.badgeText}</Badge>
                          )}
                        </div>
                        {banner.subtitle && (
                          <p className="text-sm text-gray-500 truncate">{banner.subtitle}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{banner.position}</Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Palette className="w-3 h-3" /> {banner.overlayStyle || 'dark'}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <AlignLeft className="w-3 h-3" /> {banner.textPosition || 'left'}
                          </span>
                          {banner.link && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" /> {banner.link}
                            </span>
                          )}
                          {banner.startDate && banner.endDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(banner.startDate).toLocaleDateString()} - {new Date(banner.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                          {banner.isActive ? 'Active' : 'Off'}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(banner)} title="Toggle active">
                          {banner.isActive ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(banner.id)} title="Delete">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <BottomNav items={adminNavItems} />
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Preview */}
            {(formData.image || formData.title) && (
              <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Banner preview
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-6">
                  {formData.badgeText && (
                    <span className={`inline-flex w-fit px-2.5 py-1 rounded-full text-xs font-bold text-white mb-2 ${BADGE_COLORS.find(c => c.value === formData.badgeColor)?.preview || 'bg-orange-500'}`}>
                      {formData.badgeText}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-white drop-shadow-lg">{formData.title || 'Banner Title'}</h3>
                  {formData.subtitle && (
                    <p className="text-sm text-white/80 mt-1 drop-shadow">{formData.subtitle}</p>
                  )}
                  {formData.buttonText && (
                    <span className="inline-flex w-fit mt-3 px-4 py-1.5 rounded-full bg-white text-gray-900 text-sm font-semibold">
                      {formData.buttonText}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Mega Electronics Sale"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subtitle</Label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Up to 50% off on all electronics"
                />
              </div>
            </div>

            {/* Promo Badge */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Promo Badge
              </Label>
              <div className="flex gap-3">
                <Input
                  className="flex-1"
                  value={formData.badgeText}
                  onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                  placeholder='e.g. "30% OFF", "Flash Sale", "New"'
                />
                <Select
                  value={formData.badgeColor}
                  onValueChange={(value) => setFormData({ ...formData, badgeColor: value })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_COLORS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${c.preview}`} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Desktop Image URL *</Label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://... (1920x600 recommended)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Image URL</Label>
                <Input
                  value={formData.imageMobile}
                  onChange={(e) => setFormData({ ...formData, imageMobile: e.target.value })}
                  placeholder="https://... (optional, 800x400)"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Button Text</Label>
                <Input
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  placeholder="e.g. Shop Now"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link URL</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="/products/..."
                />
              </div>
            </div>

            {/* Style Options */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" /> Overlay
                </Label>
                <Select
                  value={formData.overlayStyle}
                  onValueChange={(value) => setFormData({ ...formData, overlayStyle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Text Align
                </Label>
                <Select
                  value={formData.textPosition}
                  onValueChange={(value) => setFormData({ ...formData, textPosition: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title || !formData.image}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingBanner ? 'Update Banner' : 'Create Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
