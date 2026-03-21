'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Flashlight,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react'
import Link from 'next/link'

interface FlashSaleProduct {
  id: string
  name: string
  slug: string
  images: string | null
  price: number
  quantity: number
  isFlashSale: boolean
  flashSaleDiscount: number | null
  flashSaleStock: number | null
  flashSaleClaimed: number
  flashSaleStart: Date | string | null
  flashSaleEnd: Date | string | null
  category: { id: string; name: string } | null
}

async function fetchFlashSales(filter: string) {
  const res = await fetch(`/api/seller/flash-sales?filter=${filter}`)
  if (!res.ok) throw new Error('Failed to fetch flash sales')
  return res.json()
}

async function createFlashSale(data: any) {
  const res = await fetch('/api/seller/flash-sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create flash sale')
  }
  return res.json()
}

async function updateFlashSale(data: any) {
  const res = await fetch('/api/seller/flash-sales', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update flash sale')
  }
  return res.json()
}

async function endFlashSale(productId: string) {
  const res = await fetch(`/api/seller/flash-sales?productId=${productId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to end flash sale')
  return res.json()
}

async function fetchProducts() {
  const res = await fetch('/api/seller/products')
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

function getFlashSaleStatus(product: FlashSaleProduct): 'active' | 'upcoming' | 'ended' | 'none' {
  if (!product.isFlashSale) return 'none'
  const now = new Date()
  const start = product.flashSaleStart ? new Date(product.flashSaleStart) : null
  const end = product.flashSaleEnd ? new Date(product.flashSaleEnd) : null

  if (start && end) {
    if (now >= start && now <= end) return 'active'
    if (now < start) return 'upcoming'
    if (now > end) return 'ended'
  }
  return 'none'
}

function formatTimeLeft(endDate: Date | string): string {
  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Ended'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h left`
  }
  return `${hours}h ${minutes}m ${seconds}s left`
}

function FlashSaleCard({ product, onEdit, onEnd }: { 
  product: FlashSaleProduct
  onEdit: (product: FlashSaleProduct) => void
  onEnd: (productId: string) => void
}) {
  const status = getFlashSaleStatus(product)
  const images = product.images ? JSON.parse(product.images) : []
  const salePrice = product.flashSaleDiscount 
    ? product.price * (1 - product.flashSaleDiscount / 100)
    : product.price
  const claimedPercent = product.flashSaleStock 
    ? Math.min((product.flashSaleClaimed / product.flashSaleStock) * 100, 100)
    : 0

  const statusConfig = {
    active: { color: 'bg-green-500', textColor: 'text-green-600', label: 'Active', icon: Play },
    upcoming: { color: 'bg-blue-500', textColor: 'text-blue-600', label: 'Upcoming', icon: Clock },
    ended: { color: 'bg-gray-500', textColor: 'text-gray-600', label: 'Ended', icon: XCircle },
    none: { color: 'bg-gray-400', textColor: 'text-gray-500', label: 'No Sale', icon: Package },
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
        {images[0] ? (
          <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}
        {status === 'active' && product.flashSaleDiscount && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-red-500 hover:bg-red-600 text-white">
              {product.flashSaleDiscount}% OFF
            </Badge>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className={`${config.color} text-white`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </div>
      <CardContent className="pt-4">
        <Link href={`/products/${product.slug}`} className="hover:text-primary">
          <h3 className="font-medium line-clamp-2 mb-2">{product.name}</h3>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          {product.flashSaleDiscount ? (
            <>
              <span className="text-lg font-bold text-red-600">
                UGX {Math.round(salePrice).toLocaleString()}
              </span>
              <span className="text-sm text-gray-500 line-through">
                UGX {product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold">UGX {product.price.toLocaleString()}</span>
          )}
        </div>

        {status === 'active' && product.flashSaleEnd && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-sm text-orange-600 mb-1">
              <Clock className="w-4 h-4" />
              <span>{formatTimeLeft(product.flashSaleEnd)}</span>
            </div>
            {product.flashSaleStock && (
              <div>
                <Progress value={claimedPercent} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {product.flashSaleClaimed} / {product.flashSaleStock} sold
                </p>
              </div>
            )}
          </div>
        )}

        {status === 'upcoming' && product.flashSaleStart && (
          <div className="flex items-center gap-1 text-sm text-blue-600 mb-3">
            <Calendar className="w-4 h-4" />
            <span>Starts: {new Date(product.flashSaleStart).toLocaleDateString()}</span>
          </div>
        )}

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Sale
              </DropdownMenuItem>
              {(status === 'active' || status === 'upcoming') && (
                <DropdownMenuItem 
                  onClick={() => onEnd(product.id)}
                  className="text-red-600"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  End Sale
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FlashSalesPage() {
  const [filter, setFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<FlashSaleProduct | null>(null)
  const [formData, setFormData] = useState({
    productId: '',
    discount: '20',
    stock: '',
    startAt: '',
    endAt: '',
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['flash-sales', filter],
    queryFn: () => fetchFlashSales(filter),
  })

  const { data: productsData } = useQuery({
    queryKey: ['seller-products'],
    queryFn: fetchProducts,
  })

  const createMutation = useMutation({
    mutationFn: createFlashSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] })
      setDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      alert(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateFlashSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] })
      setDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      alert(error.message)
    },
  })

  const endMutation = useMutation({
    mutationFn: endFlashSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] })
    },
  })

  const products = data?.products || []
  const stats = data?.stats || { active: 0, upcoming: 0, ended: 0, totalSaved: 0 }
  const availableProducts = productsData?.products?.filter((p: any) => 
    p.status === 'ACTIVE' && p.quantity > 0
  ) || []

  const resetForm = () => {
    setFormData({
      productId: '',
      discount: '20',
      stock: '',
      startAt: '',
      endAt: '',
    })
    setEditingProduct(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = (product: FlashSaleProduct) => {
    setEditingProduct(product)
    setFormData({
      productId: product.id,
      discount: product.flashSaleDiscount?.toString() || '20',
      stock: product.flashSaleStock?.toString() || '',
      startAt: product.flashSaleStart 
        ? new Date(product.flashSaleStart).toISOString().slice(0, 16)
        : '',
      endAt: product.flashSaleEnd
        ? new Date(product.flashSaleEnd).toISOString().slice(0, 16)
        : '',
    })
    setDialogOpen(true)
  }

  const handleEnd = (productId: string) => {
    if (confirm('Are you sure you want to end this flash sale?')) {
      endMutation.mutate(productId)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingProduct) {
      updateMutation.mutate({
        productId: formData.productId,
        discount: parseFloat(formData.discount),
        stock: parseInt(formData.stock),
        startAt: formData.startAt,
        endAt: formData.endAt,
      })
    } else {
      createMutation.mutate({
        productId: formData.productId,
        discount: parseFloat(formData.discount),
        stock: parseInt(formData.stock),
        startAt: formData.startAt,
        endAt: formData.endAt,
      })
    }
  }

  const selectedProduct = availableProducts.find((p: any) => p.id === formData.productId) || 
    (editingProduct ? { quantity: editingProduct.quantity } : null)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Flashlight className="w-6 h-6 text-orange-500" />
                Flash Sales
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create and manage limited-time discounts
              </p>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Flash Sale
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Sales</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Play className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ended</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.ended}</p>
                </div>
                <XCircle className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Saved</p>
                  <p className="text-xl font-bold text-orange-600">
                    UGX {Math.round(stats.totalSaved).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'ended', label: 'Ended' },
            { value: 'not-set', label: 'Not Set' },
          ].map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Flashlight className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Flash Sales</h3>
              <p className="text-gray-500 mb-4">
                {filter === 'all' 
                  ? "You haven't created any flash sales yet."
                  : `No ${filter} flash sales.`}
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Flash Sale
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product: FlashSaleProduct) => (
              <FlashSaleCard
                key={product.id}
                product={product}
                onEdit={handleOpenEdit}
                onEnd={handleEnd}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Flash Sale' : 'Create Flash Sale'}
            </DialogTitle>
            <DialogDescription>
              Set up a limited-time discount for your product
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingProduct && (
              <div className="space-y-2">
                <Label>Select Product</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => setFormData({ ...formData, productId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (Stock: {p.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Discount Percentage (%)</Label>
              <Input
                type="number"
                min="1"
                max="99"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                placeholder="e.g., 20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Flash Sale Stock</Label>
              <Input
                type="number"
                min="1"
                max={selectedProduct?.quantity || 999}
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder={`Max: ${selectedProduct?.quantity || 0}`}
                required
              />
              {selectedProduct && (
                <p className="text-xs text-gray-500">
                  Available stock: {selectedProduct.quantity}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Preview */}
            {formData.productId && formData.discount && (
              <Card className="bg-gray-50 dark:bg-gray-800">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Preview</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {Math.round((selectedProduct?.price || 0) * (1 - parseInt(formData.discount) / 100)).toLocaleString()} UGX
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      {(selectedProduct?.price || 0).toLocaleString()} UGX
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Customers save {Math.round((selectedProduct?.price || 0) * parseInt(formData.discount) / 100).toLocaleString()} UGX
                  </p>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {editingProduct ? 'Update Sale' : 'Create Sale'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
