'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Award,
  Star,
  Store,
  Package,
  TrendingUp,
  Shield,
  Clock,
  Loader2,
  CheckCircle,
  Zap,
  Crown,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'

const TIER_CONFIG = {
  STARTER: {
    name: 'STARTER',
    displayName: 'Starter Seller',
    description: 'New sellers starting their journey. Basic features with buyer protection.',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    icon: Store,
    requirements: {
      minOrders: 0,
      minRating: 0,
    },
    limits: {
      maxProducts: 10,
      maxTransaction: '500K UGX',
    },
    fees: {
      commission: 15,
      escrowHoldDays: 7,
    },
  },
  VERIFIED: {
    name: 'VERIFIED',
    displayName: 'Verified Seller',
    description: 'ID verified sellers with proven track record. More features and lower fees.',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    icon: Shield,
    requirements: {
      minOrders: 0,
      minRating: 0,
    },
    limits: {
      maxProducts: 100,
      maxTransaction: '5M UGX',
    },
    fees: {
      commission: 10,
      escrowHoldDays: 5,
    },
  },
  PREMIUM: {
    name: 'PREMIUM',
    displayName: 'Premium Seller',
    description: 'Top-tier sellers with business verification. Best rates and exclusive features.',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Crown,
    requirements: {
      minOrders: 50,
      minRating: 4.5,
    },
    limits: {
      maxProducts: 'Unlimited',
      maxTransaction: 'Unlimited',
    },
    fees: {
      commission: 8,
      escrowHoldDays: 3,
    },
  },
}

async function fetchStores() {
  const res = await fetch('/api/stores?limit=200')
  if (!res.ok) throw new Error('Failed to fetch stores')
  return res.json()
}

async function overrideStoreTier(data: { storeId: string; tier: string }) {
  const res = await fetch('/api/admin/tiers/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to override tier')
  }
  return res.json()
}

export default function AdminTiersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [overrideDialog, setOverrideDialog] = useState<{
    open: boolean
    store: any | null
    newTier: string
  }>({ open: false, store: null, newTier: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tiers-stores'],
    queryFn: fetchStores,
  })

  const overrideMutation = useMutation({
    mutationFn: overrideStoreTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tiers-stores'] })
      toast({
        title: 'Tier Updated',
        description: 'Store tier has been updated successfully.',
      })
      setOverrideDialog({ open: false, store: null, newTier: '' })
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
      s.user?.email?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = tierFilter === 'all' ||
      s.verificationTier === tierFilter ||
      (!s.verificationTier && tierFilter === 'STARTER')
    return matchesSearch && matchesFilter
  })

  const getTierBadge = (tier: string) => {
    const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.STARTER
    return (
      <Badge className={config.color}>
        {config.displayName}
      </Badge>
    )
  }

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
              <h2 className="text-lg md:text-xl font-semibold">Seller Tiers</h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                Manage seller tier assignments and view tier requirements
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Tier Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {(Object.keys(TIER_CONFIG) as Array<keyof typeof TIER_CONFIG>).map((key) => {
              const tier = TIER_CONFIG[key]
              const Icon = tier.icon
              const storeCount = stores.filter(
                (s: any) => (s.verificationTier || 'STARTER') === key
              ).length

              return (
                <Card key={key} className={tier.border}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${tier.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tier.displayName}</CardTitle>
                          <CardDescription className="text-xs">
                            {storeCount} store{storeCount !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {tier.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Package className="w-3 h-3" />
                          Max Products
                        </div>
                        <p className="font-semibold">{tier.limits.maxProducts}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <TrendingUp className="w-3 h-3" />
                          Max Transaction
                        </div>
                        <p className="font-semibold">{tier.limits.maxTransaction}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Zap className="w-3 h-3" />
                          Commission
                        </div>
                        <p className="font-semibold">{tier.fees.commission}%</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Clock className="w-3 h-3" />
                          Escrow Hold
                        </div>
                        <p className="font-semibold">{tier.fees.escrowHoldDays} days</p>
                      </div>
                    </div>

                    {tier.requirements.minOrders > 0 && (
                      <div className="text-xs text-gray-500 bg-white dark:bg-gray-900 rounded-lg p-3">
                        <p><strong>Requires:</strong> {tier.requirements.minOrders}+ orders & {tier.requirements.minRating}+ rating</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Stores Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>All Stores by Tier</CardTitle>
                  <CardDescription>
                    View and manage seller tier assignments across the platform
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search stores..."
                    className="w-48"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Filter tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="STARTER">Starter</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="PREMIUM">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No stores found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Current Tier</TableHead>
                        <TableHead>Total Orders</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStores.map((store: any) => {
                        const tier = store.verificationTier || 'STARTER'
                        const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.STARTER
                        return (
                          <TableRow key={store.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
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
                                <p className="text-sm font-medium">{store.user?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{store.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={config.color}>
                                {config.displayName}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{store.totalOrders || 0}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span>{(store.rating || 0).toFixed(1)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{store.commissionRate || config.fees.commission}%</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setOverrideDialog({
                                    open: true,
                                    store,
                                    newTier: tier,
                                  })
                                }
                              >
                                <Award className="w-3 h-3 mr-1" />
                                Override
                              </Button>
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

          {/* Auto-Promotion Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Auto-Promotion Engine
              </CardTitle>
              <CardDescription>
                Verified stores are automatically promoted to higher tiers when they meet requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                  <p className="font-medium text-sm text-green-800 dark:text-green-300 mb-2">
                    How it works
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• After escrow release, the system evaluates eligible stores</li>
                    <li>• Stores meeting all requirements are promoted automatically</li>
                    <li>• Sellers receive a notification about their tier upgrade</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                  <p className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-2">
                    Tier Progression
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• <strong>Starter</strong> → Auto-verified with ID + Selfie</li>
                    <li>• <strong>Verified</strong> → Premium at 50+ orders & 4.5+ rating</li>
                    <li>• <strong>Premium</strong> → Best commission rates (8%)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={adminNavItems} />
      </main>

      {/* Override Tier Dialog */}
      <Dialog open={overrideDialog.open} onOpenChange={(open) => setOverrideDialog({ open, store: overrideDialog.store, newTier: overrideDialog.newTier })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Override Store Tier
            </DialogTitle>
            <DialogDescription>
              Change the tier for &ldquo;{overrideDialog.store?.name}&rdquo;. This will override the automatic tier calculation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Tier</Label>
              <div className="flex items-center gap-2">
                {overrideDialog.store && getTierBadge(overrideDialog.store.verificationTier || 'STARTER')}
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Tier</Label>
              <Select
                value={overrideDialog.newTier}
                onValueChange={(value) => setOverrideDialog({ ...overrideDialog, newTier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Starter (15% commission)</SelectItem>
                  <SelectItem value="VERIFIED">Verified (10% commission)</SelectItem>
                  <SelectItem value="PREMIUM">Premium (8% commission)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {overrideDialog.newTier === 'PREMIUM' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Premium stores get unlimited products, lowest commission (8%), and fastest payouts (3-day escrow).
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog({ open: false, store: null, newTier: '' })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (overrideDialog.store && overrideDialog.newTier) {
                  overrideMutation.mutate({
                    storeId: overrideDialog.store.id,
                    tier: overrideDialog.newTier,
                  })
                }
              }}
              disabled={overrideMutation.isPending || !overrideDialog.newTier}
            >
              {overrideMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
