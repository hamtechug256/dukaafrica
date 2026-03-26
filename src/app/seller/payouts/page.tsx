'use client'


import { useUser, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowDownToLine,
  CreditCard,
  Smartphone,
  Building2,
  Copy,
  ExternalLink
} from 'lucide-react'
import { formatPrice } from '@/lib/currency'
import { useToast } from '@/hooks/use-toast'

// Fetch seller earnings data
async function fetchEarnings() {
  const res = await fetch('/api/seller/earnings')
  if (!res.ok) throw new Error('Failed to fetch earnings')
  return res.json()
}

// Request withdrawal
async function requestWithdrawal(data: { amount: number }) {
  const res = await fetch('/api/seller/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Withdrawal failed')
  }
  return res.json()
}

export default function SellerPayoutsPage() {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-earnings'],
    queryFn: fetchEarnings,
  })

  const withdrawalMutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-earnings'] })
      setWithdrawDialogOpen(false)
      setWithdrawAmount('')
      toast({
        title: 'Withdrawal Requested',
        description: 'Your withdrawal is being processed.',
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

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const earnings = data?.earnings || {}
  const payouts = data?.payouts || []
  const store = data?.store || {}

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
    withdrawalMutation.mutate({ amount })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/seller/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Earnings & Payouts
              </h1>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                {formatPrice(earnings.availableBalance || 0, store.currency || 'UGX')}
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
                    <DialogTitle>Request Withdrawal</DialogTitle>
                    <DialogDescription>
                      Withdraw your earnings to your configured payout method.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="amount">Amount ({store.currency || 'UGX'})</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Available: {formatPrice(earnings.availableBalance || 0, store.currency || 'UGX')}
                    </p>
                    {store.payoutMethod && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Withdrawal Method</p>
                        <div className="flex items-center gap-2 mt-1">
                          {store.payoutMethod === 'MOBILE_MONEY' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {store.payoutMethod === 'MOBILE_MONEY' 
                              ? `Mobile Money (${store.payoutPhone})` 
                              : `Bank (${store.payoutBankName} ****${store.payoutBankAccount?.slice(-4)})`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleWithdraw}
                      disabled={withdrawalMutation.isPending}
                    >
                      {withdrawalMutation.isPending ? (
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
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Balance</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPrice(earnings.pendingBalance || 0, store.currency || 'UGX')}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Funds from recent orders being processed
              </p>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-600">Lifetime</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Earned</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPrice(earnings.totalEarned || 0, store.currency || 'UGX')}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                From {earnings.totalOrders || 0} orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Setup Alert */}
        {!store.flutterwaveSubaccountId && (
          <Card className="mb-8 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Setup Your Payout Method</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Configure your mobile money or bank account to receive payments.
                  </p>
                  <Link href="/seller/settings?payout=true">
                    <Button className="mt-3">
                      Setup Payout Method
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Payouts */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
            <CardDescription>Your recent withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout: any) => (
                      <tr key={payout.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-4 text-sm">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {formatPrice(payout.amount, payout.currency)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            {payout.method === 'MOBILE_MONEY' ? (
                              <Smartphone className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Building2 className="w-4 h-4 text-gray-400" />
                            )}
                            <span>{payout.method}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            payout.status === 'COMPLETED' ? 'default' :
                            payout.status === 'PENDING' ? 'outline' :
                            payout.status === 'PROCESSING' ? 'secondary' :
                            'destructive'
                          }>
                            {payout.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {payout.reference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No withdrawals yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your withdrawal history will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings Breakdown */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
            <CardDescription>How your earnings are calculated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Product Sales</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatPrice(earnings.productEarnings || 0, store.currency || 'UGX')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  90% of product price (after {store.commissionRate || 10}% platform fee)
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Wallet className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Shipping Earnings</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatPrice(earnings.shippingEarnings || 0, store.currency || 'UGX')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  95% of shipping fee (use this to pay bus company)
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Important:</strong> The shipping portion of your earnings should be used to pay the bus company 
                when you send packages to buyers. The platform deducts a small percentage for coordination services.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
