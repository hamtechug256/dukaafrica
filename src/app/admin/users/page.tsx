'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, MoreHorizontal, UserCheck, UserX, Shield, Mail, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

const sidebarLinks = [
  { href: '/admin', icon: 'BarChart3', label: 'Dashboard' },
  { href: '/admin/users', icon: 'Users', label: 'Users' },
  { href: '/admin/categories', icon: 'Layers', label: 'Categories' },
  { href: '/admin/stores', icon: 'Store', label: 'Stores' },
  { href: '/admin/products', icon: 'Package', label: 'Products' },
  { href: '/admin/orders', icon: 'ShoppingCart', label: 'Orders' },
  { href: '/admin/escrow', icon: 'Shield', label: 'Escrow & Verification' },
  { href: '/admin/settings', icon: 'Settings', label: 'Settings' },
]

async function fetchUsers() {
  const res = await fetch('/api/admin/users')
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

async function updateUser(data: { targetUserId: string; role?: string; isActive?: boolean }) {
  const res = await fetch('/api/admin/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update user')
  }
  return res.json()
}

export default function AdminUsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: any | null; newRole: string }>({
    open: false,
    user: null,
    newRole: '',
  })
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; user: any | null }>({
    open: false,
    user: null,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast({
        title: 'User Updated',
        description: 'The user has been updated successfully.',
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

  const users = data?.users || []
  const filteredUsers = users.filter((u: any) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = () => {
    if (roleDialog.user && roleDialog.newRole) {
      updateMutation.mutate({
        targetUserId: roleDialog.user.id,
        role: roleDialog.newRole,
      })
      setRoleDialog({ open: false, user: null, newRole: '' })
    }
  }

  const handleToggleActive = () => {
    if (deactivateDialog.user) {
      updateMutation.mutate({
        targetUserId: deactivateDialog.user.id,
        isActive: !deactivateDialog.user.isActive,
      })
      setDeactivateDialog({ open: false, user: null })
    }
  }

  const handleSendEmail = (user: any) => {
    window.location.href = `mailto:${user.email}`
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
                link.href === '/admin/users'
                  ? 'bg-primary/10 text-primary'
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
            <h1 className="text-xl font-semibold">User Management</h1>
          </div>
        </header>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-gray-500">Total Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {users.filter((u: any) => u.isActive).length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">
                  {users.filter((u: any) => u.role === 'SELLER').length}
                </div>
                <div className="text-sm text-gray-500">Sellers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter((u: any) => ['ADMIN', 'SUPER_ADMIN'].includes(u.role)).length}
                </div>
                <div className="text-sm text-gray-500">Admins</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Users</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                              {user.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-medium">
                                  {user.name?.[0] || user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Unknown User'}
                              </p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'default' : user.role === 'SELLER' ? 'secondary' : 'outline'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'destructive'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.store ? (
                            <Link href={`/stores/${user.store.id}`} className="text-primary hover:underline flex items-center gap-1">
                              {user.store.name}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-gray-400">No store</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard?user=${user.id}`)}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setRoleDialog({ open: true, user, newRole: user.role })}>
                                <Shield className="w-4 h-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendEmail(user)}>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => setDeactivateDialog({ open: true, user })}
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                {user.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Change Role Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog({ open, user: roleDialog.user, newRole: roleDialog.newRole })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {roleDialog.user?.name || roleDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="role">New Role</Label>
            <Select value={roleDialog.newRole} onValueChange={(value) => setRoleDialog({ ...roleDialog, newRole: value })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUYER">Buyer</SelectItem>
                <SelectItem value="SELLER">Seller</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {roleDialog.newRole === 'SUPER_ADMIN' && (
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Super Admin has full access to all platform settings and can manage other admins.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, user: null, newRole: '' })}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Dialog */}
      <Dialog open={deactivateDialog.open} onOpenChange={(open) => setDeactivateDialog({ open, user: deactivateDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {deactivateDialog.user?.isActive ? 'Deactivate User' : 'Activate User'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {deactivateDialog.user?.isActive ? 'deactivate' : 'activate'}{' '}
              {deactivateDialog.user?.name || deactivateDialog.user?.email}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {deactivateDialog.user?.isActive && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  The user will not be able to log in or access their account until reactivated.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button 
              variant={deactivateDialog.user?.isActive ? 'destructive' : 'default'}
              onClick={handleToggleActive} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {deactivateDialog.user?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
