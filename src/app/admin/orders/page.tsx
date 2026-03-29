'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Package,
  Search,
  Download,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react'

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/stores', label: 'Stores' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/settings', label: 'Settings' },
]

async function fetchAdminOrders(params: { status?: string; payment?: string; search?: string }) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.payment) query.set('payment', params.payment)
  if (params.search) query.set('search', params.search)
  
  const res = await fetch(`/api/admin/orders?${query.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch orders')
  return res.json()
}

export default function AdminOrdersPage() {
  const [filters, setFilters] = useState({
    status: '',
    payment: '',
    search: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => fetchAdminOrders(filters),
  })

  const orders = data?.orders || []
  const stats = data?.stats || {
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    revenue: 0,
  }

  const exportOrders = () => {
    if (orders.length === 0) {
      alert('No orders to export')
      return
    }
    
    // Generate CSV
    const headers = ['Order Number', 'Buyer', 'Email', 'Store', 'Total', 'Status', 'Payment Status', 'Date']
    const rows = orders.map((order: any) => [
      order.orderNumber,
      order.shippingName || 'N/A',
      order.user?.email || 'N/A',
      order.store?.name || 'N/A',
      `${order.currency} ${order.total}`,
      order.status,
      order.paymentStatus,
      new Date(order.createdAt).toLocaleDateString(),
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      PENDING: { variant: 'secondary', className: '' },
      CONFIRMED: { variant: 'default', className: 'bg-blue-500' },
      PROCESSING: { variant: 'default', className: 'bg-blue-600' },
      SHIPPED: { variant: 'default', className: 'bg-purple-500' },
      OUT_FOR_DELIVERY: { variant: 'default', className: 'bg-orange-500' },
      DELIVERED: { variant: 'default', className: 'bg-green-500' },
      CANCELLED: { variant: 'destructive', className: '' },
      RETURNED: { variant: 'outline', className: 'text-orange-600 border-orange-600' },
    }
    const config = variants[status] || variants.PENDING
    return (
      <Badge variant={config.variant} className={config.className}>
        {status?.replace(/_/g, ' ')}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
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
                link.href === '/admin/orders'
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
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Orders Management</h1>
              <p className="text-sm text-gray-500">Manage all orders across the platform</p>
            </div>
            <Button onClick={exportOrders}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </header>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Shipped</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Delivered</p>
                    <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                    <p className="text-2xl font-bold text-primary">
                      UGX {stats.revenue?.toLocaleString() || 0}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by order number, buyer, or store..."
                      className="pl-9"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Order Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.payment}
                  onValueChange={(value) => setFilters({ ...filters, payment: value === 'all' ? '' : value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Orders ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.shippingName}</p>
                              <p className="text-xs text-gray-500">{order.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/stores/${order.store?.slug}`}
                              className="text-primary hover:underline"
                            >
                              {order.store?.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {order.currency} {order.total?.toLocaleString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'}
                              className={order.paymentStatus === 'PAID' ? 'bg-green-500' : ''}
                            >
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/orders/${order.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
