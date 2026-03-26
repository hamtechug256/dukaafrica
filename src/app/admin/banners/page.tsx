'use client'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogDescription,
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
  GripVertical,
  Eye,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Link as LinkIcon,
  TrendingUp,
  Shield,
  Package,
  ShoppingBag,
  DollarSign,
  Truck,
  Settings
} from 'lucide-react'

const sidebarLinks = [
  { href: '/admin', icon: TrendingUp, label: 'Dashboard' },
  { href: '/admin/users', icon: Shield, label: 'Users' },
  { href: '/admin/stores', icon: Package, label: 'Stores' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/admin/shipping', icon: Truck, label: 'Shipping' },
  { href: '/admin/earnings', icon: DollarSign, label: 'Earnings' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

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
  if (!res.ok) throw new Error('Failed to update banner')
  return res.json()
}

async function deleteBanner(id: string) {
  const res = await fetch(`/api/admin/banners?id=${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete banner')
  return res.json()
}

export default function AdminBannersPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [editingBanner, setEditingBanner] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image: '',
    imageMobile: '',
    link: '',
    buttonText: '',
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
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      setShowDialog(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r hidden md:block">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            DuukaAfrica
          </h1>
          <Badge variant="secondary" className="mt-1">Admin</Badge>
        </div>
        <nav className="px-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Banner Management</h2>
              <p className="text-sm text-gray-500">Manage homepage banners and sliders</p>
            </div>
            <Button onClick={() => { resetForm(); setShowDialog(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Banner
            </Button>
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
                <Card key={banner.id} className={banner.isActive ? '' : 'opacity-60'}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {banner.image ? (
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{banner.title}</h3>
                            {banner.subtitle && (
                              <p className="text-sm text-gray-500">{banner.subtitle}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline">{banner.position}</Badge>
                              {banner.link && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3" />
                                  {banner.link}
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
                          <div className="flex items-center gap-2">
                            <Badge className={banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                              {banner.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(banner)}
                            >
                              {banner.isActive ? (
                                <ToggleRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(banner.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Banner title"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Optional subtitle"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Image URL (optional)</Label>
              <Input
                value={formData.imageMobile}
                onChange={(e) => setFormData({ ...formData, imageMobile: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="/products/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  placeholder="Shop Now"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOME_SLIDER">Home Slider</SelectItem>
                    <SelectItem value="HOME_TOP">Home Top</SelectItem>
                    <SelectItem value="HOME_BOTTOM">Home Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
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
              {editingBanner ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
