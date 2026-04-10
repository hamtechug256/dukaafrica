'use client'


import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Shield,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Image as ImageIcon,
  Store,
  User,
  MapPin,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/currency'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending Review', icon: Clock },
  approved: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Approved', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected', icon: XCircle },
}

const countryFlags: Record<string, string> = {
  UGANDA: '🇺🇬',
  KENYA: '🇰🇪',
  TANZANIA: '🇹🇿',
  RWANDA: '🇷🇼',
}

async function fetchModerationQueue(params: { status: string; page: number }) {
  const query = new URLSearchParams({
    status: params.status,
    page: params.page.toString(),
  })
  const res = await fetch(`/api/admin/moderation?${query}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function moderateProduct(data: { productId: string; action: 'approve' | 'reject'; rejectionReason?: string }) {
  const res = await fetch('/api/admin/moderation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to moderate')
  return res.json()
}

export default function ModerationPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('pending')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['moderation-queue', activeTab, page],
    queryFn: () => fetchModerationQueue({ status: activeTab, page }),
  })

  const moderateMutation = useMutation({
    mutationFn: moderateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] })
      setShowRejectDialog(false)
      setRejectionReason('')
      setSelectedProduct(null)
      toast({
        title: 'Success',
        description: 'Product has been moderated successfully.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to moderate product.',
        variant: 'destructive',
      })
    },
  })

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role || user.unsafeMetadata?.role
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        router.push('/dashboard')
      }
    }
  }, [isLoaded, user, router])

  const handleApprove = (productId: string) => {
    moderateMutation.mutate({ productId, action: 'approve' })
  }

  const handleReject = () => {
    if (!selectedProduct || !rejectionReason.trim()) return
    moderateMutation.mutate({
      productId: selectedProduct.id,
      action: 'reject',
      rejectionReason: rejectionReason.trim(),
    })
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const products = data?.products || []
  const stats = data?.stats || { pending: 0, approved: 0, rejected: 0 }
  const pagination = data?.pagination

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
              <h2 className="text-lg md:text-xl font-semibold">Product Moderation</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Review and approve products before they go live</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-yellow-600">
                {stats.pending} Pending Review
              </Badge>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className={activeTab === 'pending' ? 'ring-2 ring-yellow-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending Review</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={activeTab === 'approved' ? 'ring-2 ring-green-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={activeTab === 'rejected' ? 'ring-2 ring-red-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rejected</p>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1) }} className="mb-6">
            <TabsList>
              <TabsTrigger value="pending">
                <Clock className="w-4 h-4 mr-2" />
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="approved">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approved
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <XCircle className="w-4 h-4 mr-2" />
                Rejected
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Products List */}
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : products.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No products to review</h3>
                <p className="text-gray-500">
                  {activeTab === 'pending' 
                    ? 'All products have been reviewed!' 
                    : `No ${activeTab} products`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {products.map((product: any) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Product Image */}
                      <div className="w-full md:w-48 h-48 md:h-auto bg-gray-100 flex-shrink-0">
                        {product.imagesArray?.[0] ? (
                          <img
                            src={product.imagesArray[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {product.category?.name || 'Uncategorized'}
                              </Badge>
                              {product.hasIssues && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Has Issues
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatPrice(product.price || 0, product.currency || 'UGX')}</p>
                            {product.comparePrice && (
                              <p className="text-sm text-gray-500 line-through">
                                {formatPrice(product.comparePrice, product.currency || 'UGX')}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                          {product.description || 'No description provided'}
                        </p>

                        {/* Seller Info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Store className="w-4 h-4" />
                            <span>{product.store?.name}</span>
                            {product.store?.isVerified && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{countryFlags[product.store?.country]} {product.store?.country}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{product.store?.user?.name || product.store?.user?.email}</span>
                          </div>
                        </div>

                        {/* Issues List */}
                        {product.hasIssues && product.issues?.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 mb-3">
                            <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                              Issues to address:
                            </p>
                            <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
                              {product.issues.map((issue: string, idx: number) => (
                                <li key={idx}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Rejection Reason (if rejected) */}
                        {product.rejectionReason && (
                          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 mb-3">
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">
                              Rejection Reason: {product.rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {activeTab === 'pending' && (
                            <>
                              <Button
                                onClick={() => handleApprove(product.id)}
                                disabled={moderateMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  setSelectedProduct(product)
                                  setShowRejectDialog(true)
                                }}
                                disabled={moderateMutation.isPending}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/products/${product.slug}`} target="_blank">
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/stores/${product.store?.slug}`} target="_blank">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Store
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={adminNavItems} />
      </main>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Product</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedProduct?.name}".
              The seller will be notified and can edit and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Product images are blurry. Please upload higher quality images."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || moderateMutation.isPending}
            >
              {moderateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
