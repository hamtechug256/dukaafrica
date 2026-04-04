'use client'

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
import { Switch } from '@/components/ui/switch'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileUploader, type FileUploadData } from '@/components/ui/file-uploader'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'
import {
  Plus,
  Loader2,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'


const CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'SELLER_GUIDE', label: 'Seller Guide' },
  { value: 'PRICING', label: 'Pricing' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'FAQ', label: 'FAQ' },
]

const AUDIENCES = [
  { value: 'ALL', label: 'All Users' },
  { value: 'SELLERS', label: 'Sellers' },
  { value: 'BUYERS', label: 'Buyers' },
]

const FILE_TYPES = [
  { value: 'PDF', label: 'PDF' },
  { value: 'DOC', label: 'DOC' },
  { value: 'DOCX', label: 'DOCX' },
  { value: 'XLSX', label: 'XLSX' },
  { value: 'IMAGE', label: 'Image' },
]

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// API helpers
async function fetchDocuments(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  const res = await fetch(`/api/admin/documents?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

async function createDocument(data: Record<string, unknown>) {
  const res = await fetch('/api/admin/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create document')
  return res.json()
}

async function updateDocument(data: Record<string, unknown>) {
  const res = await fetch('/api/admin/documents', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update document')
  return res.json()
}

async function deleteDocument(id: string) {
  const res = await fetch(`/api/admin/documents?id=${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete document')
  return res.json()
}

interface DocumentFormData {
  title: string
  description: string
  category: string
  fileType: string
  targetAudience: string
  isPublished: boolean
  isFeatured: boolean
  sortOrder: number
}

const defaultFormData: DocumentFormData = {
  title: '',
  description: '',
  category: 'GENERAL',
  fileType: 'PDF',
  targetAudience: 'ALL',
  isPublished: false,
  isFeatured: false,
  sortOrder: 0,
}

export default function AdminDocumentsPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDoc, setDeletingDoc] = useState<any>(null)
  const [editingDocument, setEditingDocument] = useState<any>(null)
  const [formData, setFormData] = useState<DocumentFormData>(defaultFormData)
  const [fileData, setFileData] = useState<FileUploadData | null>(null)
  const [existingFileUrl, setExistingFileUrl] = useState<string>('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAudience, setFilterAudience] = useState('')
  const [filterPublished, setFilterPublished] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Build query params
  const queryParams: Record<string, string> = {
    page: currentPage.toString(),
    limit: '20',
  }
  if (searchQuery) queryParams.search = searchQuery
  if (filterCategory) queryParams.category = filterCategory
  if (filterAudience) queryParams.targetAudience = filterAudience
  if (filterPublished) queryParams.isPublished = filterPublished

  const { data, isLoading } = useQuery({
    queryKey: ['admin-documents', queryParams],
    queryFn: () => fetchDocuments(queryParams),
  })

  const createMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      setShowDialog(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      setShowDialog(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      setDeleteDialogOpen(false)
      setDeletingDoc(null)
    },
  })

  const documents = data?.documents || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const resetForm = () => {
    setFormData(defaultFormData)
    setFileData(null)
    setExistingFileUrl('')
    setEditingDocument(null)
  }

  const handleEdit = (doc: any) => {
    setEditingDocument(doc)
    setFormData({
      title: doc.title,
      description: doc.description || '',
      category: doc.category,
      fileType: doc.fileType,
      targetAudience: doc.targetAudience,
      isPublished: doc.isPublished,
      isFeatured: doc.isFeatured,
      sortOrder: doc.sortOrder || 0,
    })
    setFileData({
      url: doc.fileUrl,
      publicId: doc.fileKey || '',
      bytes: doc.fileSize || 0,
      fileName: doc.title + '.' + (doc.fileType || 'pdf').toLowerCase(),
      type: doc.fileType || 'PDF',
    })
    setExistingFileUrl(doc.fileUrl)
    setShowDialog(true)
  }

  const handleSubmit = () => {
    if (!formData.title) return

    const fileUrl = fileData?.url || existingFileUrl
    if (!fileUrl) return

    const payload: Record<string, unknown> = {
      ...formData,
      fileUrl,
      fileType: fileData?.type || formData.fileType,
      fileSize: fileData?.bytes || 0,
      fileKey: fileData?.publicId || '',
    }

    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleTogglePublish = (doc: any) => {
    updateMutation.mutate({
      id: doc.id,
      isPublished: !doc.isPublished,
    })
  }

  const handleToggleFeatured = (doc: any) => {
    updateMutation.mutate({
      id: doc.id,
      isFeatured: !doc.isFeatured,
    })
  }

  const handleDeleteClick = (doc: any) => {
    setDeletingDoc(doc)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingDoc) {
      deleteMutation.mutate(deletingDoc.id)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterCategory('')
    setFilterAudience('')
    setFilterPublished('')
    setCurrentPage(1)
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
      {/* Desktop Sidebar - Hidden on mobile */}
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={adminNavItems}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu */}
              <MobileNav
                title="DuukaAfrica"
                badge="Admin"
                navItems={adminNavItems}
                userType="admin"
              />
              <div>
                <h2 className="text-lg md:text-xl font-semibold">Document Management</h2>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Manage seller resources, guides, and documents
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setShowDialog(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filterCategory}
                  onValueChange={(v) => {
                    setFilterCategory(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterAudience}
                  onValueChange={(v) => {
                    setFilterAudience(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Audiences</SelectItem>
                    {AUDIENCES.filter((a) => a.value !== 'ALL').map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterPublished}
                  onValueChange={(v) => {
                    setFilterPublished(v === 'ALL' ? '' : v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="true">Published</SelectItem>
                    <SelectItem value="false">Draft</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || filterCategory || filterAudience || filterPublished) && (
                  <Button variant="ghost" onClick={clearFilters} size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="text-gray-500 mb-4">
                  Create your first document to get started
                </p>
                <Button
                  onClick={() => {
                    resetForm()
                    setShowDialog(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
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
                        <TableHead>Category</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Downloads</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Date
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">
                                {doc.title}
                              </p>
                              {doc.description && (
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{doc.targetAudience}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{doc.fileType}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {formatFileSize(doc.fileSize)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{doc.downloadCount}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                doc.isPublished
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }
                            >
                              {doc.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.isFeatured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-gray-500">
                              {formatDate(doc.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleTogglePublish(doc)}
                                title={
                                  doc.isPublished ? 'Unpublish' : 'Publish'
                                }
                              >
                                {doc.isPublished ? (
                                  <EyeOff className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <Eye className="w-4 h-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleToggleFeatured(doc)}
                                title={
                                  doc.isFeatured
                                    ? 'Remove featured'
                                    : 'Set as featured'
                                }
                              >
                                {doc.isFeatured ? (
                                  <StarOff className="w-4 h-4 text-yellow-500" />
                                ) : (
                                  <Star className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(doc)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteClick(doc)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing{' '}
                    {(pagination.page - 1) * 20 + 1}–
                    {Math.min(pagination.page * 20, pagination.total)} of{' '}
                    {pagination.total} documents
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
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
                          const showEllipsis =
                            idx > 0 && p - arr[idx - 1] > 1
                          return (
                            <span key={p} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-1 text-gray-400">
                                  ...
                                </span>
                              )}
                              <Button
                                variant={
                                  p === currentPage ? 'default' : 'outline'
                                }
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => handlePageChange(p)}
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
                      onClick={() => handlePageChange(currentPage + 1)}
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

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={adminNavItems} />
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? 'Edit Document' : 'Create Document'}
            </DialogTitle>
            <DialogDescription>
              {editingDocument
                ? 'Update document details and settings'
                : 'Upload a new document resource for users'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="doc-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="doc-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Getting Started Guide for Sellers"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="doc-desc">Description</Label>
              <Textarea
                id="doc-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this document"
                rows={3}
              />
            </div>

            {/* Category & Audience */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) =>
                    setFormData({ ...formData, targetAudience: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Type & Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>File Type</Label>
                <Select
                  value={formData.fileType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, fileType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort-order">Sort Order</Label>
                <Input
                  id="sort-order"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>File Upload</Label>
              {editingDocument && existingFileUrl && !fileData && (
                <Card className="border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Current file uploaded
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {existingFileUrl}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFileData(null)
                        setExistingFileUrl('')
                      }}
                    >
                      Replace
                    </Button>
                  </div>
                </Card>
              )}
              <FileUploader
                value={fileData}
                onUploadComplete={(data) => {
                  setFileData(data)
                  setExistingFileUrl('')
                  setFormData({
                    ...formData,
                    fileType: data.type,
                  })
                }}
                onRemove={() => {
                  setFileData(null)
                  if (!editingDocument) setExistingFileUrl('')
                }}
                folder="dukaafrica/documents"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is-published">Published</Label>
                  <p className="text-xs text-muted-foreground">
                    Visible to users on the public pages
                  </p>
                </div>
                <Switch
                  id="is-published"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublished: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is-featured">Featured</Label>
                  <p className="text-xs text-muted-foreground">
                    Show in featured resources section
                  </p>
                </div>
                <Switch
                  id="is-featured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: checked })
                  }
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
              disabled={
                !formData.title ||
                !fileData?.url &&
                !existingFileUrl ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingDocument ? 'Update Document' : 'Create Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingDoc?.title}
              &rdquo;? This action cannot be undone. The file will be removed
              from storage as well.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
