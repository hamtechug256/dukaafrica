'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowLeft,
  Loader2,
  Download,
  CreditCard,
  Smartphone,
  Building2,
  ArrowDownToLine,
  Calendar,
  Percent,
  Truck,
  Package,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Fetch platform earnings
async function fetchPlatformEarnings() {
  const res = await fetch('/api/admin/earnings')
  if (!res.ok) throw new Error('Failed to fetch earnings')
  return res.json()
}

// Request platform withdrawal
async function requestPlatformWithdrawal(data: { amount: number }) {
  const res = await fetch('/api/admin/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to process withdrawal')
  return res.json()
}

export default function AdminEarningsPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-earnings'],
    queryFn: fetchPlatformEarnings,
  })

  const withdrawMutation = useMutation({
    mutationFn: requestPlatformWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-earnings'] })
      setWithdrawDialogOpen(false)
      setWithdrawAmount('')
      toast({
        title: 'Withdrawal Initiated',
        description: 'Your withdrawal request is being processed.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Withdrawal Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // Check admin access
  if (isLoaded && user) {
    const role = user.publicMetadata?.role || user.unsafeMetadata?.role
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return null
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const earnings = data?.earnings || {}
  const withdrawals = data?.withdrawals || []
  const settings = data?.settings || {}

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount.',
        variant: 'destructive',
      })
      return
    }
    if (amount > (earnings.availableBalance || 0)) {
      toast({
        title: 'Insufficient Balance',
        description: 'Withdrawal amount exceeds available balance.',
        variant: 'destructive',
      })
      return
    }
    withdrawMutation.mutate({ amount })
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Platform Earnings
                </h1>
                <p className="text-sm text-gray-500">
                  Commission & shipping markup revenue
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/shipping">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Shipping Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Earnings Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Available Balance */}
          <Card className="border-2 border-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-full">
                  <Wallet className="w-6 h-6 text-green-500" />
                </div>
                <Badge className="bg-green-500">Available</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                UGX {(earnings.availableBalance || 0).toLocaleString()}
              </p>
              <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4" disabled={!earnings.availableBalance || earnings.availableBalance <= 0}>
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Withdraw Platform Earnings</DialogTitle>
                    <DialogDescription>
                      Withdraw to your configured payout method.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="amount">Amount (UGX)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Available: UGX {(earnings.availableBalance || 0).toLocaleString()}
                    </p>
                    {settings.adminPayoutMethod && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Withdrawal Method</p>
                        <div className="flex items-center gap-2 mt-1">
                          {settings.adminPayoutMethod === 'MOBILE_MONEY' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {settings.adminPayoutMethod === 'MOBILE_MONEY' 
                              ? `Mobile Money (${settings.adminPayoutPhone})` 
                              : `Bank (${settings.adminPayoutBankName})`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleWithdraw} disabled={withdrawMutation.isPending}>
                      {withdrawMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Withdraw
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Pending Balance */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-full">
                  <Calendar className="w-6 h-6 text-yellow-500" />
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Settlement</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                UGX {(earnings.pendingBalance || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                From recent orders awaiting delivery
              </p>
            </CardContent>
          </Card>

          {/* Total Commission */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                  <Percent className="w-6 h-6 text-blue-500" />
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-600">Lifetime</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Commission</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                UGX {(earnings.totalCommission || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                From {earnings.totalOrders || 0} orders
              </p>
            </CardContent>
          </Card>

          {/* Total Shipping Markup */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-full">
                  <Truck className="w-6 h-6 text-purple-500" />
                </div>
                <Badge variant="outline" className="text-purple-600 border-purple-600">Lifetime</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shipping Markup</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                UGX {(earnings.totalShippingMarkup || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                5% hidden markup on shipping
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Earnings Breakdown
              </CardTitle>
              <CardDescription>
                How platform earnings are calculated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Percent className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Product Commission</p>
                    <p className="text-sm text-gray-500">{settings.defaultCommissionRate || 10}% of product price</p>
                  </div>
                </div>
                <p className="font-bold text-blue-600">
                  UGX {(earnings.totalCommission || 0).toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Shipping Markup</p>
                    <p className="text-sm text-gray-500">{settings.shippingMarkupPercent || 5}% hidden markup</p>
                  </div>
                </div>
                <p className="font-bold text-purple-600">
                  UGX {(earnings.totalShippingMarkup || 0).toLocaleString()}
                </p>
              </div>

              <Separator />

              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <p className="font-medium">Total Platform Earnings</p>
                </div>
                <p className="font-bold text-green-600 text-xl">
                  UGX {(earnings.totalEarnings || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-3xl font-bold">{earnings.totalOrders || 0}</p>
                  <p className="text-sm text-gray-500">Total Orders</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-3xl font-bold">{earnings.deliveredOrders || 0}</p>
                  <p className="text-sm text-gray-500">Delivered</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-3xl font-bold">{earnings.activeStores || 0}</p>
                  <p className="text-sm text-gray-500">Active Stores</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-3xl font-bold">{earnings.activeProducts || 0}</p>
                  <p className="text-sm text-gray-500">Active Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Withdrawal History
            </CardTitle>
            <CardDescription>
              Platform earnings withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        {new Date(w.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        UGX {w.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {w.method === 'MOBILE_MONEY' ? (
                            <Smartphone className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Building2 className="w-4 h-4 text-gray-400" />
                          )}
                          <span>{w.method}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          w.status === 'COMPLETED' ? 'default' :
                          w.status === 'PENDING' ? 'outline' :
                          w.status === 'PROCESSING' ? 'secondary' :
                          'destructive'
                        }>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {w.reference || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No withdrawals yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Withdrawal history will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
