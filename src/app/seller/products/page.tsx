'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Package, DollarSign, TrendingUp, AlertCircle, Loader2, Upload } from 'lucide-react'
import { useState } from 'react'

async function fetchSellerProducts() {
  const res = await fetch('/api/seller/products')
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

async function deleteProduct(id: string) {
  const res = await fetch(`/api/seller/products/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete product')
  return res.json()
}

export default function SellerProductsPage() {
  const [search, setSearch] = useState('')
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: fetchSellerProducts,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] })
      setDeleteProductId(null)
    },
    onError: (error) => {
      alert('Failed to delete product: ' + (error as Error).message)
    },
  })

  const products = data?.products || []
  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: products.length,
    active: products.filter((p: any) => p.status === 'ACTIVE').length,
    lowStock: products.filter((p: any) => p.quantity <= 5).length,
    outOfStock: products.filter((p: any) => p.quantity === 0).length,
  }

  const handleDelete = () => {
    if (deleteProductId) {
      deleteMutation.mutate(deleteProductId)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your product listings</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/seller/products/bulk">
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </Link>
              <Link href="/seller/products/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            </div>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Products</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No products found</p>
                <Link href="/seller/products/new">
                  <Button>Add Your First Product</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                            {product.images ? (
                              <img
                                src={JSON.parse(product.images)[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{product.name}</p>
                            <p className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category?.name || 'Uncategorized'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">UGX {product.price.toLocaleString()}</p>
                          {product.comparePrice && (
                            <p className="text-xs text-gray-500 line-through">
                              UGX {product.comparePrice.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={product.quantity <= 5 ? 'text-red-500 font-medium' : ''}>
                          {product.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.status === 'ACTIVE' ? 'default' :
                            product.status === 'OUT_OF_STOCK' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {product.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                            <DropdownMenuItem asChild>
                              <Link href={`/seller/products/${product.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onSelect={() => setDeleteProductId(product.id)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
              All product data including images will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
