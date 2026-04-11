'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Building2,
  ArrowRight,
  Copy,
} from 'lucide-react'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'
import { formatPrice } from '@/lib/currency'

async function fetchPayouts(status: string) {
  const res = await fetch(`/api/admin/payouts?status=${status}`)
  if (!res.ok) throw new Error('Failed to fetch payouts')
  return res.json()
}

async function processPayout(id: string, action: string, confirmationAmount: number) {
  const res = await fetch(`/api/admin/payouts/${id}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, confirmationAmount }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to process payout')
  return data
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    PENDING: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' },
    PROCESSING: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Processing' },
    COMPLETED: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Completed' },
    FAILED: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Failed' },
  }
  const c = config[status] || config.PENDING
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  )
}

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState('PENDING')
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [confirmAction, setConfirmAction] = useState<'complete' | 'fail' | null>(null)
  const [confirmAmount, setConfirmAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payouts', activeTab],
    queryFn: () => fetchPayouts(activeTab),
  })

  const payouts = data?.payouts || []
  const summary = data?.summary || { pending: 0, processing: 0, completed: 0, failed: 0 }

  const tabs = [
    { value: 'PENDING', label: 'Pending', count: summary.pending },
    { value: 'PROCESSING', label: 'Processing', count: summary.processing },
    { value: 'COMPLETED', label: 'Completed', count: summary.completed },
    { value: 'FAILED', label: 'Failed', count: summary.failed },
  ]

  const handleProcess = async () => {
    if (!selectedPayout || !confirmAction) return
    setProcessing(true)
    setProcessResult(null)
    try {
      const amount = Number(confirmAmount)
      const result = await processPayout(selectedPayout.id, confirmAction, amount)
      setProcessResult(result.message)
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] })
      // Close dialog after 2s
      setTimeout(() => {
        setSelectedPayout(null)
        setConfirmAction(null)
        setConfirmAmount('')
        setProcessResult(null)
      }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process'
      setProcessResult(`Error: ${msg}`)
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      <DesktopSidebar
        title="DuukaAfrica"
        badge="Admin"
        navItems={adminNavItems}
      />

      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <MobileNav
              title="DuukaAfrica"
              badge="Admin"
              navItems={adminNavItems}
              userType="admin"
            />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold">Seller Payouts</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Review and process seller withdrawal requests</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
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
                    <p className="text-2xl font-bold text-blue-600">{summary.processing}</p>
                  </div>
                  <Loader2 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.value)}
                className="relative"
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Payouts Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-16">
                  <Wallet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No {activeTab.toLowerCase()} payouts</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout: any) => (
                        <TableRow key={payout.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payout.sellerName}</p>
                              {payout.sellerEmail && (
                                <p className="text-xs text-gray-500">{payout.sellerEmail}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{payout.storeName}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">
                            {formatPrice(payout.amount, payout.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {payout.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Bank Transfer'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payout.method === 'MOBILE_MONEY' ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3" />
                                {payout.payoutPhone || payout.accountInfo || '—'}
                                {payout.payoutMobileProvider && (
                                  <span className="text-xs text-gray-400">
                                    ({payout.payoutMobileProvider})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="w-3 h-3" />
                                <span>
                                  {payout.payoutBankName || 'Bank'}: {payout.payoutBankAccount || '—'}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {payout.reference ? (
                              <button
                                onClick={() => copyToClipboard(payout.reference)}
                                className="flex items-center gap-1 hover:text-primary cursor-pointer"
                                title="Click to copy"
                              >
                                {payout.reference.slice(0, 20)}...
                                <Copy className="w-3 h-3" />
                              </button>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={payout.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {payout.status === 'PENDING' && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setSelectedPayout(payout)
                                    setConfirmAction('complete')
                                  }}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Pay
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedPayout(payout)
                                    setConfirmAction('fail')
                                  }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Fail
                                </Button>
                              </div>
                            )}
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

      {/* Process Payout Dialog */}
      <Dialog open={!!selectedPayout && !!confirmAction} onOpenChange={(open) => {
        if (!open) {
          setSelectedPayout(null)
          setConfirmAction(null)
          setConfirmAmount('')
          setProcessResult(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'complete' ? 'Confirm Payout Sent' : 'Fail Payout'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'complete'
                ? 'Confirm you have sent the money to the seller. This action cannot be undone.'
                : 'Mark this payout as failed. The seller\'s balance will be restored.'}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              {/* Payout Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Seller</span>
                  <span className="font-medium">{selectedPayout.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Store</span>
                  <span>{selectedPayout.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Reference</span>
                  <span className="font-mono text-xs">{selectedPayout.reference}</span>
                </div>

                {selectedPayout.method === 'MOBILE_MONEY' ? (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Phone</span>
                    <span className="font-medium">{selectedPayout.payoutPhone || selectedPayout.accountInfo}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Bank</span>
                      <span>{selectedPayout.payoutBankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Account</span>
                      <span className="font-mono">{selectedPayout.payoutBankAccount}</span>
                    </div>
                  </>
                )}

                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Amount</span>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(selectedPayout.amount, selectedPayout.currency)}
                  </span>
                </div>
              </div>

              {/* Amount Confirmation (safety) */}
              {!processResult && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type <span className="font-bold">{selectedPayout.amount}</span> to confirm
                  </label>
                  <Input
                    type="number"
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    placeholder={String(selectedPayout.amount)}
                  />
                  <p className="text-xs text-gray-400">
                    This amount must match exactly to proceed
                  </p>
                </div>
              )}

              {/* Result message */}
              {processResult && (
                <div className={`rounded-lg p-3 text-sm ${
                  processResult.startsWith('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {processResult}
                </div>
              )}
            </div>
          )}

          {!processResult && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPayout(null)
                  setConfirmAction(null)
                  setConfirmAmount('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant={confirmAction === 'complete' ? 'default' : 'destructive'}
                onClick={handleProcess}
                disabled={
                  processing ||
                  Number(confirmAmount) !== selectedPayout?.amount
                }
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {confirmAction === 'complete' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Sent
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Fail Payout
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav items={adminNavItems} />
    </div>
  )
}
