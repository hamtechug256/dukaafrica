'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Award,
  Store,
  Package,
  Shield,
  Clock,
  Loader2,
  CheckCircle,
  Zap,
  Crown,
  Settings,
  Users,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'

// ─── Fallback defaults ───────────────────────────────────────────
const DEFAULT_TIERS: any[] = [
  { tierName: 'STARTER', displayName: 'Starter Seller', commissionRate: 15, escrowHoldDays: 7, maxProducts: 10, maxTransactionAmount: 500000 },
  { tierName: 'VERIFIED', displayName: 'Verified Seller', commissionRate: 10, escrowHoldDays: 5, maxProducts: 100, maxTransactionAmount: 5000000 },
  { tierName: 'PREMIUM', displayName: 'Premium Seller', commissionRate: 8, escrowHoldDays: 3, maxProducts: -1, maxTransactionAmount: -1 },
]

const TIER_STYLES: Record<string, any> = {
  STARTER: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700', icon: Store },
  VERIFIED: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', border: 'border-green-200 dark:border-green-800', icon: Shield },
  PREMIUM: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', icon: Crown },
}

function fmtMoney(val: number) {
  if (val < 0) return 'Unlimited'
  if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M UGX`
  if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K UGX`
  return `${val} UGX`
}

// ─── Component ───────────────────────────────────────────────────
export default function AdminTiersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('rules')
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')

  // Dialog states
  const [editingTier, setEditingTier] = useState<any>(null)
  const [overrideDialog, setOverrideDialog] = useState<{ open: boolean; store: any; newTier: string }>({ open: false, store: null, newTier: '' })

  // Tier edit form
  const [tierForm, setTierForm] = useState({
    displayName: '', description: '', commissionRate: 15, escrowHoldDays: 7,
    maxProducts: 10, maxTransactionAmount: 500000,
    requiresIdVerification: false, requiresSelfie: false, requiresBusinessDoc: false, requiresTaxDoc: false,
    canFeatureProducts: false, canCreateFlashSales: false, canBulkUpload: false, hasPrioritySupport: false, hasAnalytics: false,
  })
  const [isSavingTier, setIsSavingTier] = useState(false)

  // Auth
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => { const r = await fetch('/api/user/role'); return r.json() },
    staleTime: 1000 * 60 * 5,
  })
  useEffect(() => {
    if (!roleLoading && roleData && !roleData.user?.isAdmin) router.push('/dashboard')
  }, [roleData, roleLoading, router])

  // Data fetches
  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['admin-tiers-stores'],
    queryFn: async () => { const r = await fetch('/api/admin/stores'); return r.json() },
    enabled: !!roleData?.user?.isAdmin,
  })
  const { data: tierData } = useQuery({
    queryKey: ['admin-tier-configs'],
    queryFn: async () => { const r = await fetch('/api/admin/tiers'); return r.json() },
    staleTime: 1000 * 60 * 10,
  })

  const tiers = tierData?.tiers?.length > 0 ? tierData.tiers : DEFAULT_TIERS
  const stores = storesData?.stores || []

  const filteredStores = stores.filter((s: any) => {
    const ms = s.name?.toLowerCase().includes(search.toLowerCase()) || s.user?.email?.toLowerCase().includes(search.toLowerCase())
    const mt = tierFilter === 'all' || (s.verificationTier || 'STARTER') === tierFilter
    return ms && mt
  })

  // ─── Tier config save ──────────────────────────────────────────
  const openTierEditor = (tier: any) => {
    setEditingTier(tier)
    setTierForm({
      displayName: tier.displayName || '',
      description: tier.description || '',
      commissionRate: Number(tier.commissionRate) || 15,
      escrowHoldDays: tier.escrowHoldDays || 7,
      maxProducts: Number(tier.maxProducts) || 10,
      maxTransactionAmount: Number(tier.maxTransactionAmount) || 500000,
      requiresIdVerification: tier.requiresIdVerification || false,
      requiresSelfie: tier.requiresSelfie || false,
      requiresBusinessDoc: tier.requiresBusinessDoc || false,
      requiresTaxDoc: tier.requiresTaxDoc || false,
      canFeatureProducts: tier.canFeatureProducts || false,
      canCreateFlashSales: tier.canCreateFlashSales || false,
      canBulkUpload: tier.canBulkUpload || false,
      hasPrioritySupport: tier.hasPrioritySupport || false,
      hasAnalytics: tier.hasAnalytics || false,
    })
  }

  const handleSaveTier = async () => {
    if (!editingTier) return
    setIsSavingTier(true)
    try {
      const res = await fetch('/api/admin/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierName: editingTier.tierName, ...tierForm }),
      })
      if (res.ok) {
        toast({ title: 'Success', description: `${tierForm.displayName} tier updated` })
        setEditingTier(null)
        queryClient.invalidateQueries({ queryKey: ['admin-tier-configs'] })
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Failed to update tier', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save tier config', variant: 'destructive' })
    } finally {
      setIsSavingTier(false)
    }
  }

  // ─── Store tier override ───────────────────────────────────────
  const overrideMutation = useMutation({
    mutationFn: async (data: { storeId: string; tier: string }) => {
      const r = await fetch('/api/admin/tiers/override', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed') }
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tiers-stores'] })
      toast({ title: 'Tier Updated', description: 'Store tier has been updated' })
      setOverrideDialog({ open: false, store: null, newTier: '' })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  // ─── Loading ───────────────────────────────────────────────────
  if (roleLoading || !roleData?.user?.isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const tierStyle = (name: string) => TIER_STYLES[name] || TIER_STYLES.STARTER
  const getBadge = (name: string) => { const s = tierStyle(name); return <Badge className={s.color}>{name}</Badge> }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex overflow-x-hidden">
      <DesktopSidebar title="DuukaAfrica" badge="Admin" navItems={adminNavItems} />

      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center gap-3">
            <MobileNav title="DuukaAfrica" badge="Admin" navItems={adminNavItems} userType="admin" />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold">Seller Tiers</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Configure tier rules and manage seller tier assignments</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* ─── Tab Navigation ──────────────────────────────── */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="rules" className="gap-2"><Settings className="w-4 h-4" />Tier Rules</TabsTrigger>
              <TabsTrigger value="stores" className="gap-2"><Users className="w-4 h-4" />Stores ({stores.length})</TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════════════════ */}
            {/* TAB 1: TIER RULES                                 */}
            {/* ═══════════════════════════════════════════════════ */}
            <TabsContent value="rules" className="space-y-6 mt-6">
              {tiers.map((tier: any) => {
                const style = tierStyle(tier.tierName)
                const Icon = style.icon
                const storeCount = stores.filter((s: any) => (s.verificationTier || 'STARTER') === tier.tierName).length

                return (
                  <Card key={tier.tierName} className={style.border}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${style.color}`}><Icon className="w-5 h-5" /></div>
                          <div>
                            <CardTitle className="text-lg">{tier.displayName || tier.tierName}</CardTitle>
                            <CardDescription className="text-xs">
                              {storeCount} store{storeCount !== 1 ? 's' : ''} · {tier.tierName}
                            </CardDescription>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => openTierEditor(tier)}>
                          <Settings className="w-4 h-4 mr-2" />Configure
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tier.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{tier.description}</p>
                      )}

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Zap className="w-3 h-3" />Commission</div>
                          <p className="font-bold text-lg">{tier.commissionRate}%</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Clock className="w-3 h-3" />Escrow Hold</div>
                          <p className="font-bold text-lg">{tier.escrowHoldDays} days</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Package className="w-3 h-3" />Max Products</div>
                          <p className="font-bold text-lg">{Number(tier.maxProducts) < 0 ? 'Unlimited' : tier.maxProducts}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><TrendingUp className="w-3 h-3" />Max Transaction</div>
                          <p className="font-bold text-lg">{fmtMoney(Number(tier.maxTransactionAmount))}</p>
                        </div>
                      </div>

                      {/* Requirements badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tier.requiresIdVerification && <Badge variant="secondary">ID Verification</Badge>}
                        {tier.requiresSelfie && <Badge variant="secondary">Selfie with ID</Badge>}
                        {tier.requiresBusinessDoc && <Badge variant="secondary">Business Document</Badge>}
                        {tier.requiresTaxDoc && <Badge variant="secondary">Tax Document</Badge>}
                        {tier.requiresMinOrders > 0 && <Badge variant="secondary">{tier.requiresMinOrders}+ Orders</Badge>}
                        {tier.requiresMinRating > 0 && <Badge variant="secondary">{tier.requiresMinRating}+ Rating</Badge>}
                        {!tier.requiresIdVerification && !tier.requiresSelfie && !tier.requiresBusinessDoc && !tier.requiresTaxDoc && tier.requiresMinOrders === 0 && (
                          <span className="text-xs text-gray-400">No special requirements</span>
                        )}
                      </div>

                      {/* Features badges */}
                      <div className="flex flex-wrap gap-2">
                        {tier.canFeatureProducts && <Badge variant="outline">Feature Products</Badge>}
                        {tier.canCreateFlashSales && <Badge variant="outline">Flash Sales</Badge>}
                        {tier.canBulkUpload && <Badge variant="outline">Bulk Upload</Badge>}
                        {tier.hasPrioritySupport && <Badge variant="outline">Priority Support</Badge>}
                        {tier.hasAnalytics && <Badge variant="outline">Analytics</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Auto-Promotion Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" />Auto-Promotion Engine</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                      <p className="font-medium text-sm text-green-800 dark:text-green-300 mb-2">How it works</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>After escrow release, the system evaluates eligible stores</li>
                        <li>Stores meeting all requirements are promoted automatically</li>
                        <li>Sellers receive a notification about their tier upgrade</li>
                      </ul>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                      <p className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-2">Tier Progression</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li><strong>Starter</strong> → Verified with ID + Selfie</li>
                        <li><strong>Verified</strong> → Premium at 50+ orders & 4.5+ rating</li>
                        <li><strong>Premium</strong> → Best commission rates (8%)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════ */}
            {/* TAB 2: STORES                                    */}
            {/* ═══════════════════════════════════════════════════ */}
            <TabsContent value="stores" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle>All Stores by Tier</CardTitle>
                      <CardDescription>View and manage seller tier assignments</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Search stores..." className="w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
                      <Select value={tierFilter} onValueChange={setTierFilter}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Filter" /></SelectTrigger>
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
                  {storesLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : filteredStores.length === 0 ? (
                    <div className="text-center py-12"><Award className="w-12 h-12 mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No stores found</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Store</TableHead><TableHead>Owner</TableHead><TableHead>Tier</TableHead>
                            <TableHead>Products</TableHead><TableHead>Orders</TableHead><TableHead>Commission</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStores.map((store: any) => {
                            const tier = store.verificationTier || 'STARTER'
                            return (
                              <TableRow key={store.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                      {store.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store className="w-5 h-5 text-gray-400" /></div>}
                                    </div>
                                    <div><p className="font-medium">{store.name}</p><p className="text-xs text-gray-500">{store.slug}</p></div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div><p className="text-sm font-medium">{store.user?.name || 'N/A'}</p><p className="text-xs text-gray-500">{store.user?.email}</p></div>
                                </TableCell>
                                <TableCell>{getBadge(tier)}</TableCell>
                                <TableCell><span className="font-medium">{store.totalProducts || 0}</span></TableCell>
                                <TableCell><span className="font-medium">{store.totalOrders || 0}</span></TableCell>
                                <TableCell><span className="font-medium">{store.commissionRate}%</span></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm" onClick={() => setOverrideDialog({ open: true, store, newTier: tier })}>
                                    <Award className="w-3 h-3 mr-1" />Override
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
            </TabsContent>
          </Tabs>
        </div>

        <BottomNav items={adminNavItems} />
      </main>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DIALOG: Configure Tier Rules                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!editingTier} onOpenChange={() => setEditingTier(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Configure {editingTier?.displayName}</DialogTitle>
            <DialogDescription>Adjust the settings for this seller tier. Changes take effect immediately.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Basic Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Display Name</Label><Input value={tierForm.displayName} onChange={(e) => setTierForm({ ...tierForm, displayName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Commission Rate (%)</Label><Input type="number" min="0" max="100" value={tierForm.commissionRate} onChange={(e) => setTierForm({ ...tierForm, commissionRate: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Escrow Hold Days</Label><Input type="number" min="1" max="90" value={tierForm.escrowHoldDays} onChange={(e) => setTierForm({ ...tierForm, escrowHoldDays: parseInt(e.target.value) || 1 })} /></div>
                <div className="space-y-2"><Label>Max Products (-1 = Unlimited)</Label><Input type="number" value={tierForm.maxProducts} onChange={(e) => setTierForm({ ...tierForm, maxProducts: parseInt(e.target.value) || 0 })} /></div>
                <div className="space-y-2 col-span-2"><Label>Max Transaction Amount (UGX, -1 = Unlimited)</Label><Input type="number" value={tierForm.maxTransactionAmount} onChange={(e) => setTierForm({ ...tierForm, maxTransactionAmount: parseFloat(e.target.value) || 0 })} /></div>
              </div>
            </div>

            {/* Verification Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium">Verification Requirements</h4>
              <div className="space-y-3">
                {[
                  { key: 'requiresIdVerification', label: 'Require ID Verification' },
                  { key: 'requiresSelfie', label: 'Require Selfie with ID' },
                  { key: 'requiresBusinessDoc', label: 'Require Business Document' },
                  { key: 'requiresTaxDoc', label: 'Require Tax Document' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch checked={(tierForm as any)[key]} onCheckedChange={(c) => setTierForm({ ...tierForm, [key]: c })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h4 className="font-medium">Tier Features</h4>
              <div className="space-y-3">
                {[
                  { key: 'canFeatureProducts', label: 'Can Feature Products' },
                  { key: 'canCreateFlashSales', label: 'Can Create Flash Sales' },
                  { key: 'canBulkUpload', label: 'Bulk Upload' },
                  { key: 'hasPrioritySupport', label: 'Priority Support' },
                  { key: 'hasAnalytics', label: 'Analytics Access' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch checked={(tierForm as any)[key]} onCheckedChange={(c) => setTierForm({ ...tierForm, [key]: c })} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTier(null)}>Cancel</Button>
            <Button onClick={handleSaveTier} disabled={isSavingTier}>
              {isSavingTier && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DIALOG: Override Store Tier                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={overrideDialog.open} onOpenChange={(open) => setOverrideDialog({ ...overrideDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Award className="w-5 h-5" />Override Store Tier</DialogTitle>
            <DialogDescription>Change the tier for &ldquo;{overrideDialog.store?.name}&rdquo;.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Tier</Label>
              <div className="flex items-center gap-2">{overrideDialog.store && getBadge(overrideDialog.store.verificationTier || 'STARTER')}</div>
            </div>
            <div className="space-y-2">
              <Label>New Tier</Label>
              <Select value={overrideDialog.newTier} onValueChange={(v) => setOverrideDialog({ ...overrideDialog, newTier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog({ open: false, store: null, newTier: '' })}>Cancel</Button>
            <Button onClick={() => overrideDialog.store && overrideMutation.mutate({ storeId: overrideDialog.store.id, tier: overrideDialog.newTier })} disabled={overrideMutation.isPending}>
              {overrideMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
