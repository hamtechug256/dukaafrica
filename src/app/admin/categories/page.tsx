'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Layers, Plus, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Star, ArrowUpDown, Loader2, Search, AlertCircle, Database
} from 'lucide-react'
import { ImageUploader } from '@/components/ui/image-uploader'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  icon: string | null
  parentId: string | null
  order: number
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  children: Category[]
  _count?: { products: number }
}

async function fetchCategories() {
  const res = await fetch('/api/admin/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function createCategory(data: any) {
  const res = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create category')
  }
  return res.json()
}

async function updateCategory(id: string, data: any) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update category')
  }
  return res.json()
}

async function deleteCategory(id: string) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete category')
  }
  return res.json()
}

async function seedDefaultCategories() {
  const res = await fetch('/api/admin/seed-categories', {
    method: 'POST',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to seed categories')
  }
  return res.json()
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    icon: '',
    parentId: '__none__',
    order: 0,
    isActive: true,
    isFeatured: false,
  })

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategories,
  })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsDeleteDialogOpen(false)
      setDeletingCategory(null)
    },
  })

  const seedMutation = useMutation({
    mutationFn: seedDefaultCategories,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      alert(data.message || 'Default categories created successfully!')
    },
    onError: (error: Error) => {
      alert(error.message)
    },
  })

  // Check role from database
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const res = await fetch('/api/user/role')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    if (!roleLoading && roleData) {
      if (!roleData.user?.isAdmin) {
        router.push('/dashboard')
      }
    }
  }, [roleData, roleLoading, router])

  if (roleLoading || !roleData?.user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const categories: Category[] = categoriesData?.categories || []

  // Filter parent categories for dropdown
  const parentCategories = categories.filter(c => !c.parentId)

  // Filter categories based on search
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: '',
      icon: '',
      parentId: '__none__',
      order: 0,
      isActive: true,
      isFeatured: false,
    })
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      icon: category.icon || '',
      parentId: category.parentId || '__none__',
      order: category.order,
      isActive: category.isActive,
      isFeatured: category.isFeatured,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setDeletingCategory(category)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      ...formData,
      order: Number(formData.order),
      parentId: formData.parentId === '__none__' ? null : formData.parentId || null,
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }))
  }

  // Toggle category active status
  const toggleActive = (category: Category) => {
    updateMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive }
    })
  }

  // Toggle featured status
  const toggleFeatured = (category: Category) => {
    updateMutation.mutate({
      id: category.id,
      data: { isFeatured: !category.isFeatured }
    })
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
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <MobileNav
              title="DuukaAfrica"
              badge="Admin"
              navItems={adminNavItems}
              userType="admin"
            />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold">Categories Management</h2>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-sm text-gray-500">Total Categories</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {categories.filter(c => c.isActive).length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {categories.filter(c => c.isFeatured).length}
                </div>
                <div className="text-sm text-gray-500">Featured</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">
                  {categories.reduce((acc, c) => acc + (c._count?.products || 0), 0)}
                </div>
                <div className="text-sm text-gray-500">Total Products</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <Card className="mb-6">
            <CardContent className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {categories.length === 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                  >
                    {seedMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    Seed Default Categories
                  </Button>
                )}
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Categories Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>Manage product categories for your marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No categories found matching your search' : 'No categories yet. Create your first category!'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Order</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <span className="text-sm text-gray-500">{category.order}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={category.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Layers className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{category.name}</div>
                              {category.description && (
                                <div className="text-sm text-gray-500 line-clamp-1">
                                  {category.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {category.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {category._count?.products || 0} products
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleActive(category)}
                            className="flex items-center gap-1"
                            disabled={updateMutation.isPending}
                          >
                            {category.isActive ? (
                              <Badge className="bg-green-500 hover:bg-green-600 cursor-pointer">
                                <Eye className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="cursor-pointer">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleFeatured(category)}
                            className="flex items-center gap-1"
                            disabled={updateMutation.isPending}
                          >
                            {category.isFeatured ? (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600 cursor-pointer">
                                <Star className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="cursor-pointer">
                                <Star className="w-3 h-3 mr-1" />
                                Normal
                              </Badge>
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(category)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={adminNavItems} />
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details below.'
                : 'Fill in the details to create a new category.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Electronics"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., electronics"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    /categories/{formData.slug || 'slug'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category"
                  rows={2}
                />
              </div>

              {/* Enhanced Image Uploader */}
              <div className="space-y-2">
                <Label>Category Image</Label>
                <ImageUploader
                  value={formData.image}
                  onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                  folder="duukaafrica/categories"
                  aspectRatio="16/9"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon Name</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="e.g., Smartphone"
                  />
                  <a 
                    href="https://lucide.dev/icons" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Browse Lucide icons
                  </a>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Category</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (Top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (Top-level)</SelectItem>
                      {parentCategories
                        .filter(c => c.id !== editingCategory?.id)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end gap-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
                    />
                    <Label htmlFor="isFeatured" className="cursor-pointer">Featured</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {deletingCategory && (deletingCategory._count?.products || 0) > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This category has {deletingCategory._count?.products} products. You must move or delete these products first.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
              disabled={deleteMutation.isPending || (deletingCategory?._count?.products || 0) > 0}
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
