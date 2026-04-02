'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Package,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  Star,
  Clock,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  Users,
  Store,
  ShoppingCart,
  Settings,
  BarChart3,
  Shield,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'

const sidebarLinks = [
  { href: '/admin', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/categories', icon: Layers, label: 'Categories' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/disputes', icon: AlertTriangle, label: 'Disputes' },
  { href: '/admin/escrow', icon: Shield, label: 'Escrow' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

async function fetchUserRole() {
  const res = await fetch('/api/user/role')
  return res.json()
}

async function fetchAdminProducts(page: number, status: string, search: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    status,
    search,
  })
  const res = await fetch(`/api/admin/products?${params}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

async function updateProduct(data: { productId: string; action: string; rejectionReason?: string }) {
  const res = await fetch('/api/admin/products', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update product')
  }
  return res.json()
}

async function deleteProduct(productId: string) {
  const res = await fetch(`/api/admin/products?productId=${productId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete product')
  return res.json()
}

export default function AdminProductsPage() {
  const pathname = usePathname()

  // Fetch user role for sidebar nav
  const { data: roleData } = useQuery({
    queryKey: ['user-role'],
    queryFn: fetchUserRole,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  })

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  })
  const [rejectionReason, setRejectionReason] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, status, search],
    queryFn: () => fetchAdminProducts(page, status, search),
  })

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    },
  })

  const products = data?.products || []
  const pagination = data?.pagination || { total: 0, pages: 0, page: 1, limit: 20 }
  const stats = data?.stats || { ACTIVE: 0, DRAFT: 0, INACTIVE: 0, OUT_OF_STOCK: 0, pendingReview: 0 }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleAction = (productId: string, action: string) => {
    if (action === 'reject') {
      setRejectDialog({ open: true, productId })
    } else {
      updateMutation.mutate({ productId, action })
    }
  }

  const handleReject = () => {
    if (rejectDialog.productId && rejectionReason) {
      updateMutation.mutate({
        productId: rejectDialog.productId,
        action: 'reject',
        rejectionReason,
      })
      setRejectDialog({ open: false, productId: null })
      setRejectionReason('')
    }
  }

  const handleDelete = (productId: string) => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteMutation.mutate(productId)
    }
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      ACTIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
      DRAFT: { variant: 'secondary', className: '' },
      INACTIVE: { variant: 'outline', className: '' },
      OUT_OF_STOCK: { variant: 'destructive', className: '' },
    }
    const config = configs[status] || configs.DRAFT
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={sidebarLinks}
        userEmail={roleData?.user?.email}
        isSuperAdmin={roleData?.user?.isSuperAdmin}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <MobileNav
              title="DuukaAfrica"
              badge="Admin"
              navItems={sidebarLinks}
              userType="admin"
              userEmail={roleData?.user?.email}
            />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold">Products Management</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Manage and moderate all products on the platform</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatus('ALL')}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-xl md:text-2xl font-bold">{Object.values(stats).reduce((a: number, b) => a + (b as number), 0) - (stats.pendingReview || 0)}</p>
                  </div>
                  <Package className="w-5 h-5 text-gray-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-green-500 transition-colors" onClick={() => setStatus('ACTIVE')}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600">{stats.ACTIVE}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-yellow-500 transition-colors" onClick={() => setStatus('DRAFT')}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Draft</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-600">{stats.DRAFT}</p>
                  </div>
                  <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-red-500 transition-colors" onClick={() => setStatus('OUT_OF_STOCK')}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Out of Stock</p>
                    <p className="text-xl md:text-2xl font-bold text-red-600">{stats.OUT_OF_STOCK}</p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-orange-500 transition-colors border-orange-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Pending Review</p>
                    <p className="text-xl md:text-2xl font-bold text-orange-600">{stats.pendingReview}</p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    aria-label="Search products"
                  />
                </div>
                <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No products found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product: any) => {
                      const images = product.images ? JSON.parse(product.images) : []
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                {images[0] ? (
                                  <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-6 h-6 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium line-clamp-1">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.category?.name || 'No category'}</p>
                              </div>
                              {product.isFeatured && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[120px] lg:max-w-none">{product.store?.name}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[140px] lg:max-w-none">{product.store?.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">UGX {product.price?.toLocaleString()}</p>
                            {product.comparePrice && (
                              <p className="text-xs text-gray-400 line-through">
                                UGX {product.comparePrice.toLocaleString()}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={product.quantity <= 5 ? 'text-red-500 font-medium' : ''}>
                              {product.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(product.status)}
                              {product.submittedForReview && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                                  Pending Review
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p>{product._count?.orderItems || 0}</p>
                            <p className="text-xs text-gray-500">{product._count?.reviews || 0} reviews</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/products/${product.slug}`}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </Link>
                                </DropdownMenuItem>
                                {product.submittedForReview && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleAction(product.id, 'approve')}>
                                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAction(product.id, 'reject')}>
                                      <XCircle className="w-4 h-4 mr-2 text-red-500" />
                                      Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {product.status === 'ACTIVE' && (
                                  <DropdownMenuItem onClick={() => handleAction(product.id, 'deactivate')}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                {product.status === 'INACTIVE' && (
                                  <DropdownMenuItem onClick={() => handleAction(product.id, 'activate')}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                {product.isFeatured ? (
                                  <DropdownMenuItem onClick={() => handleAction(product.id, 'unfeature')}>
                                    <Star className="w-4 h-4 mr-2 text-yellow-500" />
                                    Unfeature
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleAction(product.id, 'feature')}>
                                    <Star className="w-4 h-4 mr-2" />
                                    Feature
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page === pagination.pages}
                onClick={() => setPage(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={sidebarLinks} />
      </main>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, productId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Product</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this product. This will be shared with the seller.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Product images do not meet quality standards..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, productId: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
