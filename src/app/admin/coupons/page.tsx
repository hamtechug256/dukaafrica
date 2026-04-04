'use client'


import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
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
  Ticket,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Percent,
  DollarSign,
  Truck,
  Copy,
  Check,
} from 'lucide-react'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'

async function fetchCoupons() {
  const res = await fetch('/api/admin/coupons')
  if (!res.ok) throw new Error('Failed to fetch coupons')
  return res.json()
}

async function createCoupon(data: any) {
  const res = await fetch('/api/admin/coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create coupon')
  return res.json()
}

async function updateCoupon(data: any) {
  const res = await fetch('/api/admin/coupons', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update coupon')
  return res.json()
}

async function deleteCoupon(id: string) {
  const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete coupon')
  return res.json()
}

export default function AdminCouponsPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<any>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: '',
    minOrder: '',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: '1',
    startDate: '',
    endDate: '',
    forNewUsers: false,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: fetchCoupons,
  })

  const createMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      setShowDialog(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      setShowDialog(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    },
  })

  const coupons = data?.coupons || []

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      type: 'PERCENTAGE',
      value: '',
      minOrder: '',
      maxDiscount: '',
      usageLimit: '',
      perUserLimit: '1',
      startDate: '',
      endDate: '',
      forNewUsers: false,
    })
    setEditingCoupon(null)
  }

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.value.toString(),
      minOrder: coupon.minOrder?.toString() || '',
      maxDiscount: coupon.maxDiscount?.toString() || '',
      usageLimit: coupon.usageLimit?.toString() || '',
      perUserLimit: coupon.perUserLimit.toString(),
      startDate: new Date(coupon.startDate).toISOString().split('T')[0],
      endDate: new Date(coupon.endDate).toISOString().split('T')[0],
      forNewUsers: coupon.forNewUsers,
    })
    setShowDialog(true)
  }

  const handleSubmit = () => {
    const data = {
      ...formData,
      startDate: formData.startDate || new Date().toISOString(),
      endDate: formData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleActive = (coupon: any) => {
    updateMutation.mutate({
      id: coupon.id,
      isActive: !coupon.isActive,
    })
  }

  const isExpired = (coupon: any) => new Date(coupon.endDate) < new Date()
  const isUpcoming = (coupon: any) => new Date(coupon.startDate) > new Date()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={adminNavItems}
      />

      {/* Main Content */}
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
              <h2 className="text-lg md:text-xl font-semibold">Coupon Management</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Create and manage discount coupons</p>
            </div>
            <div className="ml-auto">
              <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : coupons.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No coupons yet</h3>
                <p className="text-gray-500 mb-4">Create your first coupon to offer discounts</p>
                <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Coupon
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coupon: any) => (
                <Card key={coupon.id} className={coupon.isActive ? '' : 'opacity-60'}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${
                          coupon.type === 'PERCENTAGE' ? 'bg-green-100 text-green-600' :
                          coupon.type === 'FIXED' ? 'bg-blue-100 text-blue-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {coupon.type === 'PERCENTAGE' ? <Percent className="w-5 h-5" /> :
                           coupon.type === 'FIXED' ? <DollarSign className="w-5 h-5" /> :
                           <Truck className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` :
                             coupon.type === 'FIXED' ? `UGX ${coupon.value.toLocaleString()}` :
                             'Free Shipping'}
                          </p>
                          <p className="text-xs text-gray-500">{coupon.type}</p>
                        </div>
                      </div>
                      <Badge className={coupon.isActive && !isExpired(coupon) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                        {isExpired(coupon) ? 'Expired' : isUpcoming(coupon) ? 'Upcoming' : coupon.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <code className="text-lg font-mono font-bold">{coupon.code}</code>
                        <Button variant="ghost" size="icon" onClick={() => copyCode(coupon.code)}>
                          {copied === coupon.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      {coupon.description && (
                        <p className="text-sm text-gray-500 mt-1">{coupon.description}</p>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 space-y-1">
                      {coupon.minOrder && (
                        <p>Min order: UGX {coupon.minOrder.toLocaleString()}</p>
                      )}
                      {coupon.maxDiscount && (
                        <p>Max discount: UGX {coupon.maxDiscount.toLocaleString()}</p>
                      )}
                      <p>Used: {coupon.usageCount} / {coupon.usageLimit || '∞'}</p>
                      <p>Per user: {coupon.perUserLimit}x</p>
                      <p>
                        {new Date(coupon.startDate).toLocaleDateString()} - {new Date(coupon.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(coupon)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(coupon)}
                      >
                        {coupon.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteMutation.mutate(coupon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={adminNavItems} />
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="20% off your order"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'PERCENTAGE' ? '20' : '5000'}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Order</Label>
                <Input
                  type="number"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  placeholder="10000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Discount</Label>
                <Input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.code || !formData.value}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingCoupon ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
