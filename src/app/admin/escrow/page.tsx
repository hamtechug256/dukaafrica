'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Shield,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  TrendingUp,
  Settings,
  ChevronRight,
  Loader2
} from 'lucide-react'

interface TierConfig {
  id: string
  tierName: string
  displayName: string
  description: string | null
  requiresIdVerification: boolean
  requiresSelfie: boolean
  requiresBusinessDoc: boolean
  requiresTaxDoc: boolean
  requiresPhysicalLocation: boolean
  requiresMinOrders: number
  requiresMinRating: number
  maxProducts: number
  maxTransactionAmount: number
  maxDailyOrders: number
  commissionRate: number
  escrowHoldDays: number
  canFeatureProducts: boolean
  canCreateFlashSales: boolean
  canBulkUpload: boolean
  hasPrioritySupport: boolean
  hasAnalytics: boolean
  badgeText: string | null
  badgeColor: string | null
  isActive: boolean
  order: number
}

interface EscrowSummary {
  totalHeld: number
  totalReleased: number
  totalRefunded: number
  totalDisputed: number
  heldTransactions: number
  avgHoldDays: number
}

interface PendingVerification {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  country: string
  verificationStatus: string
  verificationTier: string
  idType: string | null
  idDocumentUrl: string | null
  selfieWithIdUrl: string | null
  businessDocUrl: string | null
  taxDocUrl: string | null
  createdAt: string
  owner: {
    id: string
    name: string | null
    email: string
  }
}

export default function AdminEscrowPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  
  // Data states
  const [escrowSummary, setEscrowSummary] = useState<EscrowSummary | null>(null)
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([])
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([])
  
  // Dialog states
  const [editingTier, setEditingTier] = useState<TierConfig | null>(null)
  const [reviewingStore, setReviewingStore] = useState<PendingVerification | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  
  // Form states for tier editing
  const [tierForm, setTierForm] = useState({
    displayName: '',
    description: '',
    commissionRate: 15,
    escrowHoldDays: 7,
    maxProducts: 10,
    maxTransactionAmount: 500000,
    requiresIdVerification: false,
    requiresSelfie: false,
    requiresBusinessDoc: false,
    requiresTaxDoc: false,
    badgeText: '',
    badgeColor: '',
    canFeatureProducts: false,
    canCreateFlashSales: false,
    canBulkUpload: false,
    hasPrioritySupport: false,
    hasAnalytics: false,
  })

  // Fetch all data
  useEffect(() => {
    fetchEscrowSummary()
    fetchTierConfigs()
    fetchPendingVerifications()
  }, [])

  const fetchEscrowSummary = async () => {
    try {
      const res = await fetch('/api/admin/escrow/summary')
      if (res.ok) {
        const data = await res.json()
        setEscrowSummary(data)
      }
    } catch (error) {
      console.error('Error fetching escrow summary:', error)
    }
  }

  const fetchTierConfigs = async () => {
    try {
      const res = await fetch('/api/admin/tiers')
      if (res.ok) {
        const data = await res.json()
        setTierConfigs(data.tiers || [])
      }
    } catch (error) {
      console.error('Error fetching tier configs:', error)
    }
  }

  const fetchPendingVerifications = async () => {
    try {
      const res = await fetch('/api/admin/verification?status=PENDING')
      if (res.ok) {
        const data = await res.json()
        setPendingVerifications(data.stores || [])
      }
    } catch (error) {
      console.error('Error fetching verifications:', error)
    }
  }

  const handleUpdateTier = async () => {
    if (!editingTier) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierName: editingTier.tierName,
          ...tierForm
        })
      })
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Tier configuration updated' })
        setEditingTier(null)
        fetchTierConfigs()
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update tier' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update tier' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveVerification = async (storeId: string, tier: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          action: 'APPROVE',
          tier
        })
      })
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Verification approved' })
        setReviewingStore(null)
        fetchPendingVerifications()
        fetchEscrowSummary()
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve verification' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve verification' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectVerification = async (storeId: string) => {
    if (!rejectReason.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Rejection reason is required' })
      return
    }
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          action: 'REJECT',
          rejectionReason: rejectReason
        })
      })
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Verification rejected' })
        setReviewingStore(null)
        setRejectReason('')
        fetchPendingVerifications()
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject verification' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject verification' })
    } finally {
      setIsLoading(false)
    }
  }

  const openTierEditor = (tier: TierConfig) => {
    setEditingTier(tier)
    setTierForm({
      displayName: tier.displayName,
      description: tier.description || '',
      commissionRate: tier.commissionRate,
      escrowHoldDays: tier.escrowHoldDays,
      maxProducts: tier.maxProducts,
      maxTransactionAmount: tier.maxTransactionAmount,
      requiresIdVerification: tier.requiresIdVerification,
      requiresSelfie: tier.requiresSelfie,
      requiresBusinessDoc: tier.requiresBusinessDoc,
      requiresTaxDoc: tier.requiresTaxDoc,
      badgeText: tier.badgeText || '',
      badgeColor: tier.badgeColor || '',
      canFeatureProducts: tier.canFeatureProducts,
      canCreateFlashSales: tier.canCreateFlashSales,
      canBulkUpload: tier.canBulkUpload,
      hasPrioritySupport: tier.hasPrioritySupport,
      hasAnalytics: tier.hasAnalytics,
    })
  }

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      {/* Header */}
      <header className="bg-white dark:bg-[oklch(0.15_0.02_45)] border-b border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.25_0.02_45)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)] hover:text-[oklch(0.6_0.2_35)]">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
                  Escrow & Verification
                </h1>
                <p className="text-sm text-[oklch(0.45_0.02_45)] dark:text-[oklch(0.65_0.01_85)]">
                  Manage buyer protection and seller verification
                </p>
              </div>
            </div>
            <Badge className="bg-[oklch(0.55_0.15_140)]/10 text-[oklch(0.55_0.15_140)]">
              Admin Only
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verifications">
              Verifications ({pendingVerifications.length})
            </TabsTrigger>
            <TabsTrigger value="tiers">Tier Settings</TabsTrigger>
            <TabsTrigger value="escrow">Escrow Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Held</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[oklch(0.6_0.2_35)]" />
                    UGX {(escrowSummary?.totalHeld || 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">
                    {escrowSummary?.heldTransactions || 0} transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Released This Month</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[oklch(0.55_0.15_140)]" />
                    UGX {(escrowSummary?.totalReleased || 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[oklch(0.55_0.15_140)]">
                    Released to sellers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Refunded</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[oklch(0.5_0.15_200)]" />
                    UGX {(escrowSummary?.totalRefunded || 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[oklch(0.5_0.15_200)]">
                    Buyer refunds
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Under Dispute</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[oklch(0.6_0.2_35)]" />
                    UGX {(escrowSummary?.totalDisputed || 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[oklch(0.6_0.2_35)]">
                    Needs resolution
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Seller Tiers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tierConfigs.map((tier) => (
                      <div key={tier.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ background: tier.badgeColor || 'oklch(0.6 0.2 35)' }}
                          />
                          <span className="font-medium">{tier.displayName}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{tier.commissionRate}% commission</p>
                          <p className="text-xs text-[oklch(0.45_0.02_45)]">{tier.escrowHoldDays} day hold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Verification Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingVerifications.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 mx-auto text-[oklch(0.55_0.15_140)] mb-4" />
                      <p className="text-[oklch(0.45_0.02_45)]">All caught up!</p>
                      <p className="text-sm text-[oklch(0.55_0.02_45)]">No pending verifications</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingVerifications.slice(0, 5).map((store) => (
                        <div 
                          key={store.id} 
                          className="flex items-center justify-between cursor-pointer hover:bg-[oklch(0.96_0.02_85)] dark:hover:bg-[oklch(0.2_0.02_45)] p-2 rounded-lg"
                          onClick={() => {
                            setReviewingStore(store)
                            setActiveTab('verifications')
                          }}
                        >
                          <div>
                            <p className="font-medium">{store.name}</p>
                            <p className="text-sm text-[oklch(0.45_0.02_45)]">{store.owner.email}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-[oklch(0.55_0.02_45)]" />
                        </div>
                      ))}
                      {pendingVerifications.length > 5 && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setActiveTab('verifications')}
                        >
                          View All ({pendingVerifications.length})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications">
            <Card>
              <CardHeader>
                <CardTitle>Pending Verifications</CardTitle>
                <CardDescription>
                  Review and approve seller verification requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingVerifications.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto text-[oklch(0.55_0.15_140)] mb-4" />
                    <p className="text-lg font-medium">No pending verifications</p>
                    <p className="text-[oklch(0.45_0.02_45)]">All requests have been processed</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingVerifications.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{store.name}</p>
                              <p className="text-sm text-[oklch(0.45_0.02_45)]">{store.country}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{store.owner.name || 'No name'}</p>
                              <p className="text-sm text-[oklch(0.45_0.02_45)]">{store.owner.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {store.idDocumentUrl && (
                                <Badge variant="outline" className="text-[oklch(0.55_0.15_140)]">ID</Badge>
                              )}
                              {store.selfieWithIdUrl && (
                                <Badge variant="outline" className="text-[oklch(0.55_0.15_140)]">Selfie</Badge>
                              )}
                              {store.businessDocUrl && (
                                <Badge variant="outline" className="text-[oklch(0.6_0.2_35)]">Business</Badge>
                              )}
                              {store.taxDocUrl && (
                                <Badge variant="outline" className="text-[oklch(0.5_0.15_200)]">Tax</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(store.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => setReviewingStore(store)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tier Settings Tab */}
          <TabsContent value="tiers">
            <div className="space-y-6">
              {tierConfigs.map((tier) => (
                <Card key={tier.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ background: tier.badgeColor || 'oklch(0.6 0.2 35)' }}
                        />
                        <div>
                          <CardTitle>{tier.displayName}</CardTitle>
                          <CardDescription>{tier.description}</CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => openTierEditor(tier)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-[oklch(0.45_0.02_45)]">Commission Rate</p>
                        <p className="text-xl font-bold">{tier.commissionRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-[oklch(0.45_0.02_45)]">Escrow Hold</p>
                        <p className="text-xl font-bold">{tier.escrowHoldDays} days</p>
                      </div>
                      <div>
                        <p className="text-sm text-[oklch(0.45_0.02_45)]">Max Products</p>
                        <p className="text-xl font-bold">
                          {tier.maxProducts === -1 ? 'Unlimited' : tier.maxProducts}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[oklch(0.45_0.02_45)]">Max Transaction</p>
                        <p className="text-xl font-bold">
                          {tier.maxTransactionAmount === -1 
                            ? 'Unlimited' 
                            : `UGX ${tier.maxTransactionAmount.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-[oklch(0.9_0.02_85)]">
                      <p className="text-sm font-medium mb-3">Requirements</p>
                      <div className="flex flex-wrap gap-2">
                        {tier.requiresIdVerification && (
                          <Badge variant="secondary">ID Verification</Badge>
                        )}
                        {tier.requiresSelfie && (
                          <Badge variant="secondary">Selfie with ID</Badge>
                        )}
                        {tier.requiresBusinessDoc && (
                          <Badge variant="secondary">Business Document</Badge>
                        )}
                        {tier.requiresTaxDoc && (
                          <Badge variant="secondary">Tax Document</Badge>
                        )}
                        {!tier.requiresIdVerification && !tier.requiresSelfie && !tier.requiresBusinessDoc && !tier.requiresTaxDoc && (
                          <span className="text-sm text-[oklch(0.45_0.02_45)]">No verification required</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[oklch(0.9_0.02_85)]">
                      <p className="text-sm font-medium mb-3">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {tier.canFeatureProducts && <Badge variant="outline">Feature Products</Badge>}
                        {tier.canCreateFlashSales && <Badge variant="outline">Flash Sales</Badge>}
                        {tier.canBulkUpload && <Badge variant="outline">Bulk Upload</Badge>}
                        {tier.hasPrioritySupport && <Badge variant="outline">Priority Support</Badge>}
                        {tier.hasAnalytics && <Badge variant="outline">Analytics</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Escrow Settings Tab */}
          <TabsContent value="escrow">
            <Card>
              <CardHeader>
                <CardTitle>Escrow Settings</CardTitle>
                <CardDescription>
                  Configure platform-wide escrow and reserve settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Reserve Percentage</Label>
                    <Input type="number" defaultValue={10} />
                    <p className="text-sm text-[oklch(0.45_0.02_45)]">
                      Percentage of each transaction held in reserve for refunds
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Reserve</Label>
                    <Input type="number" defaultValue={500000} />
                    <p className="text-sm text-[oklch(0.45_0.02_45)]">
                      Minimum amount to keep in reserve (UGX)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Escrow Hold Days</Label>
                  <Input type="number" defaultValue={7} />
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">
                    Days to hold funds before auto-release for unverified sellers
                  </p>
                </div>

                <Button className="bg-[oklch(0.55_0.15_140)] text-white hover:bg-[oklch(0.5_0.14_140)]">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Tier Edit Dialog */}
      <Dialog open={!!editingTier} onOpenChange={() => setEditingTier(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {editingTier?.displayName}</DialogTitle>
            <DialogDescription>
              Adjust the settings for this seller tier
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Basic Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input 
                    value={tierForm.displayName}
                    onChange={(e) => setTierForm({...tierForm, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission Rate (%)</Label>
                  <Input 
                    type="number"
                    value={tierForm.commissionRate}
                    onChange={(e) => setTierForm({...tierForm, commissionRate: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Escrow Hold Days</Label>
                  <Input 
                    type="number"
                    value={tierForm.escrowHoldDays}
                    onChange={(e) => setTierForm({...tierForm, escrowHoldDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Products</Label>
                  <Input 
                    type="number"
                    value={tierForm.maxProducts}
                    onChange={(e) => setTierForm({...tierForm, maxProducts: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Max Transaction Amount (UGX)</Label>
                  <Input 
                    type="number"
                    value={tierForm.maxTransactionAmount}
                    onChange={(e) => setTierForm({...tierForm, maxTransactionAmount: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium">Verification Requirements</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Require ID Verification</Label>
                  <Switch 
                    checked={tierForm.requiresIdVerification}
                    onCheckedChange={(checked) => setTierForm({...tierForm, requiresIdVerification: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Require Selfie with ID</Label>
                  <Switch 
                    checked={tierForm.requiresSelfie}
                    onCheckedChange={(checked) => setTierForm({...tierForm, requiresSelfie: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Require Business Document</Label>
                  <Switch 
                    checked={tierForm.requiresBusinessDoc}
                    onCheckedChange={(checked) => setTierForm({...tierForm, requiresBusinessDoc: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Require Tax Document</Label>
                  <Switch 
                    checked={tierForm.requiresTaxDoc}
                    onCheckedChange={(checked) => setTierForm({...tierForm, requiresTaxDoc: checked})}
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h4 className="font-medium">Tier Features</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Can Feature Products</Label>
                  <Switch 
                    checked={tierForm.canFeatureProducts}
                    onCheckedChange={(checked) => setTierForm({...tierForm, canFeatureProducts: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Can Create Flash Sales</Label>
                  <Switch 
                    checked={tierForm.canCreateFlashSales}
                    onCheckedChange={(checked) => setTierForm({...tierForm, canCreateFlashSales: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Bulk Upload</Label>
                  <Switch 
                    checked={tierForm.canBulkUpload}
                    onCheckedChange={(checked) => setTierForm({...tierForm, canBulkUpload: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Priority Support</Label>
                  <Switch 
                    checked={tierForm.hasPrioritySupport}
                    onCheckedChange={(checked) => setTierForm({...tierForm, hasPrioritySupport: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Analytics Access</Label>
                  <Switch 
                    checked={tierForm.hasAnalytics}
                    onCheckedChange={(checked) => setTierForm({...tierForm, hasAnalytics: checked})}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTier(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTier} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Review Dialog */}
      <Dialog open={!!reviewingStore} onOpenChange={() => setReviewingStore(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Verification</DialogTitle>
            <DialogDescription>
              Review documents and approve or reject verification request
            </DialogDescription>
          </DialogHeader>
          
          {reviewingStore && (
            <div className="space-y-6 py-4">
              {/* Store Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Store Name</p>
                  <p className="font-medium">{reviewingStore.name}</p>
                </div>
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Owner Email</p>
                  <p className="font-medium">{reviewingStore.owner.email}</p>
                </div>
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">Country</p>
                  <p className="font-medium">{reviewingStore.country}</p>
                </div>
                <div>
                  <p className="text-sm text-[oklch(0.45_0.02_45)]">ID Type</p>
                  <p className="font-medium">{reviewingStore.idType || 'N/A'}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="font-medium">Submitted Documents</h4>
                <div className="grid grid-cols-2 gap-4">
                  {reviewingStore.idDocumentUrl && (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">ID Document</p>
                      <img 
                        src={reviewingStore.idDocumentUrl} 
                        alt="ID Document" 
                        className="w-full h-40 object-cover rounded"
                      />
                    </div>
                  )}
                  {reviewingStore.selfieWithIdUrl && (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Selfie with ID</p>
                      <img 
                        src={reviewingStore.selfieWithIdUrl} 
                        alt="Selfie" 
                        className="w-full h-40 object-cover rounded"
                      />
                    </div>
                  )}
                  {reviewingStore.businessDocUrl && (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Business Document</p>
                      <img 
                        src={reviewingStore.businessDocUrl} 
                        alt="Business Document" 
                        className="w-full h-40 object-cover rounded"
                      />
                    </div>
                  )}
                  {reviewingStore.taxDocUrl && (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Tax Document</p>
                      <img 
                        src={reviewingStore.taxDocUrl} 
                        alt="Tax Document" 
                        className="w-full h-40 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Tier Selection */}
              <div className="space-y-4">
                <h4 className="font-medium">Approve As</h4>
                <div className="flex gap-4">
                  <Button
                    className="flex-1 bg-[oklch(0.55_0.15_140)] text-white"
                    onClick={() => handleApproveVerification(reviewingStore.id, 'VERIFIED')}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verified Seller
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                    onClick={() => handleApproveVerification(reviewingStore.id, 'PREMIUM')}
                    disabled={isLoading}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Premium Seller
                  </Button>
                </div>
              </div>

              {/* Rejection */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-[oklch(0.6_0.2_35)]">Reject Verification</h4>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={() => handleRejectVerification(reviewingStore.id)}
                  disabled={isLoading || !rejectReason.trim()}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Verification
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
// Build trigger Wed Mar 25 16:40:59 UTC 2026
