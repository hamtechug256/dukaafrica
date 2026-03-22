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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Truck,
  Package,
  DollarSign,
  Settings,
  Globe,
  Loader2,
  Edit,
  Save,
  ArrowLeft,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Fetch shipping tiers and rates
async function fetchShippingConfig() {
  const res = await fetch('/api/admin/shipping')
  if (!res.ok) throw new Error('Failed to fetch shipping config')
  return res.json()
}

// Update shipping rate
async function updateShippingRate(rateId: string, data: any) {
  const res = await fetch(`/api/admin/shipping/rates/${rateId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update rate')
  return res.json()
}

// Update platform settings
async function updatePlatformSettings(data: any) {
  const res = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update settings')
  return res.json()
}

const zoneTypeLabels: Record<string, string> = {
  LOCAL: 'Local (Same City)',
  DOMESTIC: 'Domestic (Different City)',
  REGIONAL: 'Regional (Neighboring Country)',
  CROSS_BORDER: 'Cross-Border (Distant Country)',
}

const countryFlags: Record<string, string> = {
  UGANDA: '🇺🇬',
  KENYA: '🇰🇪',
  TANZANIA: '🇹🇿',
  RWANDA: '🇷🇼',
}

export default function AdminShippingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [editingRate, setEditingRate] = useState<any>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    defaultCommissionRate: 10,
    shippingMarkupPercent: 5,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['shipping-config'],
    queryFn: fetchShippingConfig,
  })

  const updateRateMutation = useMutation({
    mutationFn: ({ rateId, data }: { rateId: string; data: any }) => updateShippingRate(rateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-config'] })
      setEditDialogOpen(false)
      toast({
        title: 'Rate Updated',
        description: 'Shipping rate has been updated successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-config'] })
      toast({
        title: 'Settings Updated',
        description: 'Platform settings have been updated successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
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

  const tiers = data?.tiers || []
  const rates = data?.rates || []
  const zoneMatrix = data?.zoneMatrix || []
  const settings = data?.settings || { defaultCommissionRate: 10, shippingMarkupPercent: 5 }

  const handleEditRate = (rate: any) => {
    setEditingRate({ ...rate })
    setEditDialogOpen(true)
  }

  const handleSaveRate = () => {
    if (!editingRate) return
    updateRateMutation.mutate({
      rateId: editingRate.id,
      data: {
        baseFee: parseFloat(editingRate.baseFee),
        perKgFee: parseFloat(editingRate.perKgFee),
        crossBorderFee: parseFloat(editingRate.crossBorderFee || 0),
        platformMarkupPercent: parseFloat(editingRate.platformMarkupPercent),
      }
    })
  }

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm)
  }

  // Group rates by tier
  const ratesByTier = tiers.map((tier: any) => ({
    tier,
    rates: rates.filter((r: any) => r.tierId === tier.id)
  }))

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
                  Shipping Management
                </h1>
                <p className="text-sm text-gray-500">
                  Configure shipping rates and zones
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Admin Only
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="rates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rates">Shipping Rates</TabsTrigger>
            <TabsTrigger value="zones">Zone Matrix</TabsTrigger>
            <TabsTrigger value="tiers">Weight Tiers</TabsTrigger>
            <TabsTrigger value="settings">Platform Settings</TabsTrigger>
          </TabsList>

          {/* Shipping Rates Tab */}
          <TabsContent value="rates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Shipping Rates by Weight & Zone
                </CardTitle>
                <CardDescription>
                  Base rates in UGX. Rates include hidden platform markup.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ratesByTier.map(({ tier, rates: tierRates }: any) => (
                  <div key={tier.id} className="mb-8">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {tier.name} - {tier.description}
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Zone Type</TableHead>
                            <TableHead>Base Fee (UGX)</TableHead>
                            <TableHead>Per Kg Fee</TableHead>
                            <TableHead>Cross-Border Fee</TableHead>
                            <TableHead>Platform Markup %</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tierRates.map((rate: any) => (
                            <TableRow key={rate.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {zoneTypeLabels[rate.zoneType] || rate.zoneType}
                                </Badge>
                              </TableCell>
                              <TableCell>{rate.baseFee.toLocaleString()}</TableCell>
                              <TableCell>{rate.perKgFee.toLocaleString()}</TableCell>
                              <TableCell>{rate.crossBorderFee?.toLocaleString() || 0}</TableCell>
                              <TableCell>{rate.platformMarkupPercent}%</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditRate(rate)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zone Matrix Tab */}
          <TabsContent value="zones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Country-to-Country Zone Matrix
                </CardTitle>
                <CardDescription>
                  Determines shipping zone based on seller and buyer countries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From (Seller)</TableHead>
                        <TableHead>To (Buyer)</TableHead>
                        <TableHead>Zone Type</TableHead>
                        <TableHead>Est. Delivery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zoneMatrix.map((zone: any) => (
                        <TableRow key={zone.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{countryFlags[zone.originCountry]}</span>
                              {zone.originCountry}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{countryFlags[zone.destCountry]}</span>
                              {zone.destCountry}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              zone.zoneType === 'LOCAL' ? 'bg-green-100 text-green-700' :
                              zone.zoneType === 'DOMESTIC' ? 'bg-blue-100 text-blue-700' :
                              zone.zoneType === 'REGIONAL' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-orange-100 text-orange-700'
                            }>
                              {zoneTypeLabels[zone.zoneType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {zone.zoneType === 'LOCAL' && '1-2 days'}
                            {zone.zoneType === 'DOMESTIC' && '2-4 days'}
                            {zone.zoneType === 'REGIONAL' && '3-7 days'}
                            {zone.zoneType === 'CROSS_BORDER' && '5-14 days'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weight Tiers Tab */}
          <TabsContent value="tiers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Weight Tiers
                </CardTitle>
                <CardDescription>
                  Products are categorized into weight tiers for shipping calculation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tiers.map((tier: any) => (
                    <Card key={tier.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-lg">{tier.name}</h4>
                          <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                            {tier.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{tier.description}</p>
                        <p className="text-sm">
                          <span className="text-gray-500">Range:</span>{' '}
                          {tier.minWeight}kg - {tier.maxWeight ? `${tier.maxWeight}kg` : '∞'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Platform Settings
                </CardTitle>
                <CardDescription>
                  Configure commission rates and shipping markup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="commissionRate">Default Commission Rate (%)</Label>
                      <Input
                        id="commissionRate"
                        type="number"
                        value={settingsForm.defaultCommissionRate}
                        onChange={(e) => setSettingsForm({ ...settingsForm, defaultCommissionRate: parseFloat(e.target.value) })}
                      />
                      <p className="text-sm text-gray-500">
                        Platform takes this % from each product sale (seller gets the rest)
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shippingMarkup">Shipping Markup (%)</Label>
                      <Input
                        id="shippingMarkup"
                        type="number"
                        value={settingsForm.shippingMarkupPercent}
                        onChange={(e) => setSettingsForm({ ...settingsForm, shippingMarkupPercent: parseFloat(e.target.value) })}
                      />
                      <p className="text-sm text-gray-500">
                        Hidden markup on shipping fees (buyer pays, platform keeps)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <h4 className="font-medium mb-2">How Payment Distribution Works</h4>
                  <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                    <p><strong>Buyer pays:</strong> Product Price + Shipping Fee</p>
                    <p><strong>Platform earns:</strong> Commission % of Product + Shipping Markup % of Shipping</p>
                    <p><strong>Seller receives:</strong> Remaining product amount + Remaining shipping amount</p>
                  </div>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Rate Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shipping Rate</DialogTitle>
            <DialogDescription>
              Update the shipping rate for this tier and zone combination.
            </DialogDescription>
          </DialogHeader>
          {editingRate && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weight Tier</Label>
                  <Input value={tiers.find((t: any) => t.id === editingRate.tierId)?.name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Zone Type</Label>
                  <Input value={zoneTypeLabels[editingRate.zoneType] || editingRate.zoneType} disabled />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseFee">Base Fee (UGX)</Label>
                  <Input
                    id="baseFee"
                    type="number"
                    value={editingRate.baseFee}
                    onChange={(e) => setEditingRate({ ...editingRate, baseFee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perKgFee">Per Kg Fee (UGX)</Label>
                  <Input
                    id="perKgFee"
                    type="number"
                    value={editingRate.perKgFee}
                    onChange={(e) => setEditingRate({ ...editingRate, perKgFee: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crossBorderFee">Cross-Border Fee (UGX)</Label>
                  <Input
                    id="crossBorderFee"
                    type="number"
                    value={editingRate.crossBorderFee || 0}
                    onChange={(e) => setEditingRate({ ...editingRate, crossBorderFee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="markup">Platform Markup (%)</Label>
                  <Input
                    id="markup"
                    type="number"
                    value={editingRate.platformMarkupPercent}
                    onChange={(e) => setEditingRate({ ...editingRate, platformMarkupPercent: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRate} disabled={updateRateMutation.isPending}>
              {updateRateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
