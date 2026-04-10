'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'
import { useToast } from '@/hooks/use-toast'
import {
  Megaphone,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PROMOTION', label: 'Promotion' },
] as const

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'All Users' },
  { value: 'SELLERS', label: 'Sellers' },
  { value: 'BUYERS', label: 'Buyers' },
] as const

const COUNTRY_OPTIONS = [
  { value: '', label: 'All Countries' },
  { value: 'UGANDA', label: 'Uganda' },
  { value: 'KENYA', label: 'Kenya' },
  { value: 'TANZANIA', label: 'Tanzania' },
  { value: 'RWANDA', label: 'Rwanda' },
  { value: 'SOUTH_SUDAN', label: 'South Sudan' },
  { value: 'BURUNDI', label: 'Burundi' },
] as const

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'EXPIRED', label: 'Expired' },
] as const

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function getTypeBadge(type: string) {
  switch (type) {
    case 'INFO':
      return 'bg-[oklch(0.85_0.1_220)] text-[oklch(0.35_0.12_220)] dark:bg-[oklch(0.3_0.08_220)] dark:text-[oklch(0.8_0.1_220)]'
    case 'WARNING':
      return 'bg-[oklch(0.9_0.08_80)] text-[oklch(0.35_0.15_60)] dark:bg-[oklch(0.25_0.1_60)] dark:text-[oklch(0.85_0.1_80)]'
    case 'MAINTENANCE':
      return 'bg-[oklch(0.88_0.08_300)] text-[oklch(0.35_0.12_300)] dark:bg-[oklch(0.25_0.08_300)] dark:text-[oklch(0.85_0.08_300)]'
    case 'PROMOTION':
      return 'bg-[oklch(0.9_0.08_140)] text-[oklch(0.3_0.12_140)] dark:bg-[oklch(0.25_0.1_140)] dark:text-[oklch(0.8_0.08_140)]'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getAudienceBadge(audience: string) {
  switch (audience) {
    case 'ALL':
      return 'bg-[oklch(0.85_0.08_35)] text-[oklch(0.35_0.1_35)]'
    case 'SELLERS':
      return 'bg-[oklch(0.9_0.06_200)] text-[oklch(0.35_0.1_200)]'
    case 'BUYERS':
      return 'bg-[oklch(0.88_0.06_160)] text-[oklch(0.3_0.1_160)]'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getStatusBadge(isActive: boolean, isExpired: boolean) {
  if (isExpired) {
    return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  }
  if (isActive) {
    return 'bg-[oklch(0.9_0.08_145)] text-[oklch(0.3_0.12_145)] dark:bg-[oklch(0.25_0.1_145)] dark:text-[oklch(0.8_0.08_145)]'
  }
  return 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchAnnouncements(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  const res = await fetch(`/api/admin/announcements?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch announcements')
  return res.json()
}

async function createAnnouncement(data: Record<string, unknown>) {
  const res = await fetch('/api/admin/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create announcement')
  }
  return res.json()
}

async function updateAnnouncement(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/admin/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update announcement')
  }
  return res.json()
}

async function deleteAnnouncement(id: string) {
  const res = await fetch(`/api/admin/announcements/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete announcement')
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAnnouncementsPage() {
  const { user, isLoaded } = useUser()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterAudience, setFilterAudience] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form fields
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formType, setFormType] = useState('INFO')
  const [formAudience, setFormAudience] = useState('ALL')
  const [formCountry, setFormCountry] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')

  const queryParams: Record<string, string> = {
    page: currentPage.toString(),
    limit: '20',
  }
  if (filterType) queryParams.type = filterType
  if (filterAudience) queryParams.targetAudience = filterAudience
  if (filterStatus) queryParams.isActive = filterStatus

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-announcements', queryParams],
    queryFn: () => fetchAnnouncements(queryParams),
    enabled: isLoaded && !!user,
  })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAnnouncement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      resetForm()
      setDialogOpen(false)
      toast({ title: 'Announcement created successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAnnouncement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      resetForm()
      setDialogOpen(false)
      setEditingId(null)
      toast({ title: 'Announcement updated successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      setDeleteDialogOpen(false)
      setDeletingId(null)
      toast({ title: 'Announcement deleted' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAnnouncement(id, { isActive: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const announcements = data?.announcements || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  function resetForm() {
    setFormTitle('')
    setFormContent('')
    setFormType('INFO')
    setFormAudience('ALL')
    setFormCountry('')
    setFormExpiresAt('')
    setEditingId(null)
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(announcement: {
    id: string
    title: string
    content: string
    type: string
    targetAudience: string
    targetCountry: string | null
    isActive: boolean
    isExpired: boolean
    createdAt: string
    expiresAt: string | null
    creatorName: string
  }) {
    setEditingId(announcement.id)
    setFormTitle(announcement.title)
    setFormContent(announcement.content)
    setFormType(announcement.type)
    setFormAudience(announcement.targetAudience)
    setFormCountry(announcement.targetCountry || '')
    setFormExpiresAt(announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : '')
    setDialogOpen(true)
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      title: formTitle,
      content: formContent,
      type: formType,
      targetAudience: formAudience,
    }
    if (formCountry) payload.targetCountry = formCountry
    if (formExpiresAt) payload.expiresAt = new Date(formExpiresAt).toISOString()

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleConfirmDelete() {
    if (deletingId) {
      deleteMutation.mutate(deletingId)
    }
  }

  const clearFilters = () => {
    setFilterType('')
    setFilterAudience('')
    setFilterStatus('')
    setCurrentPage(1)
  }

  const hasActiveFilters = filterType || filterAudience || filterStatus

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
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MobileNav
                title="DuukaAfrica"
                badge="Admin"
                navItems={adminNavItems}
                userType="admin"
              />
              <div>
                <h2 className="text-lg md:text-xl font-semibold">Announcements</h2>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Broadcast announcements to users across the platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Announcement</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={filterType || 'ALL'}
                  onValueChange={(v) => {
                    setFilterType(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filterAudience || 'ALL'}
                  onValueChange={(v) => {
                    setFilterAudience(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Audiences</SelectItem>
                    {AUDIENCE_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filterStatus || 'ALL'}
                  onValueChange={(v) => {
                    setFilterStatus(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcements table */}
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Megaphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No announcements</h3>
                <p className="text-gray-500">
                  {hasActiveFilters
                    ? 'No announcements match your filters.'
                    : 'Create your first announcement to broadcast to users.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead className="hidden md:table-cell">Country</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                        <TableHead className="hidden lg:table-cell">Creator</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {announcements.map(
                        (a: {
                          id: string
                          title: string
                          content: string
                          type: string
                          targetAudience: string
                          targetCountry: string | null
                          isActive: boolean
                          isExpired: boolean
                          createdAt: string
                          expiresAt: string | null
                          creatorName: string
                        }) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm truncate max-w-[250px]">
                                  {a.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate max-w-[250px]">
                                  {a.content.substring(0, 80)}
                                  {a.content.length > 80 ? '...' : ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${getTypeBadge(a.type)}`}>
                                {a.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${getAudienceBadge(a.targetAudience)}`}>
                                {a.targetAudience}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-sm text-gray-500">
                                {a.targetCountry || 'All Countries'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${getStatusBadge(a.isActive, a.isExpired)}`}>
                                {a.isExpired ? 'Expired' : a.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-gray-500">
                                {formatDateShort(a.createdAt)}
                              </span>
                              {a.expiresAt && (
                                <p className="text-xs text-gray-400">
                                  Expires: {formatDateShort(a.expiresAt)}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-gray-500">
                                {a.creatorName}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    toggleActiveMutation.mutate({
                                      id: a.id,
                                      isActive: a.isActive,
                                    })
                                  }
                                  disabled={toggleActiveMutation.isPending || a.isExpired}
                                  title={a.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {a.isActive ? (
                                    <Power className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <PowerOff className="w-4 h-4 text-gray-400" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(a)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingId(a.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {Math.min((pagination.page - 1) * 20 + 1, pagination.total)}-
                    {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} announcements
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: pagination.totalPages },
                        (_, i) => i + 1
                      )
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === pagination.totalPages ||
                            Math.abs(p - currentPage) <= 1
                        )
                        .map((p, idx, arr) => {
                          const showEllipsis = idx > 0 && p - arr[idx - 1] > 1
                          return (
                            <span key={p} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-1 text-gray-400">...</span>
                              )}
                              <Button
                                variant={p === currentPage ? 'default' : 'outline'}
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </Button>
                            </span>
                          )
                        })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= pagination.totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <BottomNav items={adminNavItems} />
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm()
        setDialogOpen(open)
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the announcement details. Changes will be visible immediately.'
                : 'Broadcast a new announcement to users. Notifications will be sent to matching users.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Announcement title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write the announcement content..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={formAudience} onValueChange={setFormAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Country (optional)</Label>
                <Select value={formCountry || '__none__'} onValueChange={(v) => setFormCountry(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.value || '__none__'} value={c.value || '__none__'}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formTitle.trim() ||
                formTitle.trim().length < 3 ||
                !formContent.trim() ||
                formContent.trim().length < 10 ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingId ? 'Update' : 'Create'} Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Announcement
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
              Related notifications will be marked as read.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
