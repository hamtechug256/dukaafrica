'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, MoreHorizontal, CheckCircle, XCircle, Eye, Store, Star, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/stores', label: 'Stores' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/escrow', label: 'Escrow & Verification' },
  { href: '/admin/settings', label: 'Settings' },
]

async function fetchStores() {
  const res = await fetch('/api/admin/stores')
  if (!res.ok) throw new Error('Failed to fetch stores')
  return res.json()
}

async function updateStore(data: { storeId: string; isVerified?: boolean; isActive?: boolean }) {
  const res = await fetch('/api/admin/stores', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update store')
  }
  return res.json()
}

export default function AdminStoresPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; store: any | null }>({
    open: false,
    store: null,
  })
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; store: any | null }>({
    open: false,
    store: null,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: fetchStores,
  })

  const updateMutation = useMutation({
    mutationFn: updateStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
      toast({
        title: 'Store Updated',
        description: 'The store has been updated successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const stores = data?.stores || []
  const filteredStores = stores.filter((s: any) => {
    const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.slug?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && !s.isVerified) ||
      (filter === 'verified' && s.isVerified) ||
      (filter === 'inactive' && !s.isActive)
    return matchesSearch && matchesFilter
  })

  const handleVerify = () => {
    if (verifyDialog.store) {
      updateMutation.mutate({
        storeId: verifyDialog.store.id,
        isVerified: true,
      })
      setVerifyDialog({ open: false, store: null })
    }
  }

  const handleToggleActive = () => {
    if (deactivateDialog.store) {
      updateMutation.mutate({
        storeId: deactivateDialog.store.id,
        isActive: !deactivateDialog.store.isActive,
      })
      setDeactivateDialog({ open: false, store: null })
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r hidden md:block">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            DuukaAfrica
          </Link>
          <Badge variant="secondary" className="mt-1">Admin</Badge>
        </div>
        <nav className="px-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                link.href === '/admin/stores'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-6 py-4">
            <h1 className="text-xl font-semibold">Store Management</h1>
          </div>
        </header>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stores.length}</div>
                <div className="text-sm text-gray-500">Total Stores</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {stores.filter((s: any) => s.isVerified).length}
                </div>
                <div className="text-sm text-gray-500">Verified</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {stores.filter((s: any) => !s.isVerified).length}
                </div>
                <div className="text-sm text-gray-500">Pending Verification</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">
                  {stores.filter((s: any) => !s.isActive).length}
                </div>
                <div className="text-sm text-gray-500">Inactive</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search stores..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
                All
              </Button>
              <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>
                Pending
              </Button>
              <Button variant={filter === 'verified' ? 'default' : 'outline'} onClick={() => setFilter('verified')}>
                Verified
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStores.map((store: any) => (
                      <TableRow key={store.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                              {store.logo ? (
                                <img src={store.logo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Store className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{store.name}</p>
                              <p className="text-xs text-gray-500">{store.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{store.user?.name || 'No name'}</p>
                            <p className="text-xs text-gray-500">{store.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {store.city ? `${store.city}, ` : ''}{store.country || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {store._count?.products || 0} products
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span>{store.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={store.isVerified ? 'default' : 'secondary'}>
                              {store.isVerified ? 'Verified' : 'Pending'}
                            </Badge>
                            {!store.isActive && (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </div>
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
                                <Link href={`/stores/${store.slug}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Store
                                  <ExternalLink className="w-3 h-3 ml-auto" />
                                </Link>
                              </DropdownMenuItem>
                              {!store.isVerified && (
                                <DropdownMenuItem 
                                  className="text-green-600"
                                  onClick={() => setVerifyDialog({ open: true, store })}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Verify Store
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => setDeactivateDialog({ open: true, store })}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                {store.isActive ? 'Deactivate' : 'Activate'}
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
      </main>

      {/* Verify Dialog */}
      <Dialog open={verifyDialog.open} onOpenChange={(open) => setVerifyDialog({ open, store: verifyDialog.store })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Verify Store
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to verify "{verifyDialog.store?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                Once verified, this store will receive a verified badge and buyers will see it as a trusted seller.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialog({ open: false, store: null })}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleVerify} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Dialog */}
      <Dialog open={deactivateDialog.open} onOpenChange={(open) => setDeactivateDialog({ open, store: deactivateDialog.store })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {deactivateDialog.store?.isActive ? 'Deactivate Store' : 'Activate Store'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {deactivateDialog.store?.isActive ? 'deactivate' : 'activate'} "{deactivateDialog.store?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {deactivateDialog.store?.isActive ? (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  The store's products will be hidden from the marketplace and the seller won't be able to manage orders.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  The store will be reactivated and its products will be visible on the marketplace.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialog({ open: false, store: null })}>
              Cancel
            </Button>
            <Button 
              variant={deactivateDialog.store?.isActive ? 'destructive' : 'default'}
              onClick={handleToggleActive} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {deactivateDialog.store?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
