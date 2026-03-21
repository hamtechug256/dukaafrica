'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Settings,
  Percent,
  Truck,
  CreditCard,
  Coins,
  Users,
  Store,
  Package,
  ShoppingCart,
  BarChart3,
  Shield,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const sidebarLinks = [
  { href: '/admin', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/categories', icon: Settings, label: 'Categories' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

const COUNTRIES = ['UGANDA', 'KENYA', 'TANZANIA', 'RWANDA']

interface PlatformSettings {
  commission: {
    defaultRate: number
    shippingMarkupPercent: number
  }
  flutterwave: {
    publicKey: string
    secretKey: string
    encryptionKey: string
    webhookSecret: string
    testMode: boolean
  }
  exchangeRates: {
    UGX_TO_KES: number
    UGX_TO_TZS: number
    UGX_TO_RWF: number
    KES_TO_UGX: number
    KES_TO_TZS: number
    KES_TO_RWF: number
    TZS_TO_UGX: number
    TZS_TO_KES: number
    TZS_TO_RWF: number
    RWF_TO_UGX: number
    RWF_TO_KES: number
    RWF_TO_TZS: number
    lastUpdated: string
  }
  shipping: {
    rates: Array<{
      id: string
      zoneType: string
      baseFee: number
      perKgFee: number
      crossBorderFee: number
      currency: string
      platformMarkupPercent: number
    }>
    zoneMatrix: Record<string, Record<string, string>>
  }
}

async function fetchSettings() {
  const res = await fetch('/api/admin/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

async function saveSettings(data: { section: string; data: any }) {
  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save settings')
  return res.json()
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState('commission')
  const [commissionForm, setCommissionForm] = useState({
    defaultRate: 10,
    shippingMarkupPercent: 5,
  })
  const [flutterwaveForm, setFlutterwaveForm] = useState({
    publicKey: '',
    secretKey: '',
    encryptionKey: '',
    webhookSecret: '',
  })
  const [shippingRates, setShippingRates] = useState<any[]>([])
  const [exchangeRates, setExchangeRates] = useState<any>({})

  // Check role from database
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const res = await fetch('/api/user/role')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings,
    enabled: !!roleData?.user?.isAdmin,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Settings have been updated successfully.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    },
  })

  // Update forms when settings load
  useEffect(() => {
    if (settingsData?.settings) {
      setCommissionForm(settingsData.settings.commission || { defaultRate: 10, shippingMarkupPercent: 5 })
      setFlutterwaveForm(settingsData.settings.flutterwave || { publicKey: '', secretKey: '', encryptionKey: '', webhookSecret: '' })
      setShippingRates(settingsData.settings.shipping?.rates?.length > 0 
        ? settingsData.settings.shipping.rates 
        : getDefaultShippingRates())
      setExchangeRates(settingsData.settings.exchangeRates || {})
    }
  }, [settingsData])

  // Redirect if not admin
  useEffect(() => {
    if (!roleLoading && roleData && !roleData.user?.isAdmin) {
      router.push('/dashboard')
    }
  }, [roleData, roleLoading, router])

  function getDefaultShippingRates() {
    return [
      { zoneType: 'LOCAL', baseFee: 5000, perKgFee: 500, crossBorderFee: 0, currency: 'UGX', platformMarkupPercent: 5 },
      { zoneType: 'DOMESTIC', baseFee: 8000, perKgFee: 800, crossBorderFee: 0, currency: 'UGX', platformMarkupPercent: 5 },
      { zoneType: 'REGIONAL', baseFee: 15000, perKgFee: 1500, crossBorderFee: 3000, currency: 'UGX', platformMarkupPercent: 5 },
      { zoneType: 'CROSS_BORDER', baseFee: 25000, perKgFee: 2500, crossBorderFee: 5000, currency: 'UGX', platformMarkupPercent: 5 },
    ]
  }

  function handleSaveSection(section: string, data: any) {
    saveMutation.mutate({ section, data })
  }

  function updateShippingRate(index: number, field: string, value: any) {
    const updated = [...shippingRates]
    updated[index] = { ...updated[index], [field]: value }
    setShippingRates(updated)
  }

  if (roleLoading || !roleData?.user?.isAdmin || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r hidden md:block">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            DuukaAfrica
          </h1>
          <Badge variant="secondary" className="mt-1">Admin</Badge>
        </div>
        <nav className="px-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                link.href === '/admin/settings'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Platform Settings</h2>
              <p className="text-sm text-gray-500">Configure commission, shipping, payments, and more</p>
            </div>
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {roleData?.user?.email || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="commission" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Commission
              </TabsTrigger>
              <TabsTrigger value="shipping" className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Shipping
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="currency" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Currency
              </TabsTrigger>
            </TabsList>

            {/* Commission Settings */}
            <TabsContent value="commission">
              <Card>
                <CardHeader>
                  <CardTitle>Commission Settings</CardTitle>
                  <CardDescription>
                    Set the platform commission rate and shipping markup. These affect all sellers on the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="defaultRate">Default Platform Commission (%)</Label>
                      <Input
                        id="defaultRate"
                        type="number"
                        min="0"
                        max="50"
                        value={commissionForm.defaultRate}
                        onChange={(e) => setCommissionForm({ ...commissionForm, defaultRate: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-gray-500">
                        This percentage is taken from each product sale. Recommended: 5-15%
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingMarkup">Shipping Fee Markup (%)</Label>
                      <Input
                        id="shippingMarkup"
                        type="number"
                        min="0"
                        max="20"
                        value={commissionForm.shippingMarkupPercent}
                        onChange={(e) => setCommissionForm({ ...commissionForm, shippingMarkupPercent: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-gray-500">
                        Hidden markup added to shipping fees. This is your profit from shipping coordination.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                      How Commission Works
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      When a buyer pays UGX 100,000 for a product with 10% commission:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <li>• Seller receives: UGX 90,000 (90%)</li>
                      <li>• Platform receives: UGX 10,000 (10%)</li>
                      <li>• Shipping markup is separate and added on top</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSection('commission', commissionForm)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Commission Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shipping Settings */}
            <TabsContent value="shipping">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Rates</CardTitle>
                  <CardDescription>
                    Configure shipping fees for each zone. Rates are in the base currency (UGX) and converted for buyers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Zone Type</TableHead>
                          <TableHead>Base Fee (UGX)</TableHead>
                          <TableHead>Per Kg Fee</TableHead>
                          <TableHead>Cross-Border Fee</TableHead>
                          <TableHead>Platform Markup %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shippingRates.map((rate, index) => (
                          <TableRow key={rate.zoneType}>
                            <TableCell className="font-medium">
                              <Badge variant={
                                rate.zoneType === 'LOCAL' ? 'default' :
                                rate.zoneType === 'REGIONAL' ? 'secondary' :
                                rate.zoneType === 'DOMESTIC' ? 'outline' : 'destructive'
                              }>
                                {rate.zoneType.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={rate.baseFee}
                                onChange={(e) => updateShippingRate(index, 'baseFee', parseInt(e.target.value))}
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={rate.perKgFee}
                                onChange={(e) => updateShippingRate(index, 'perKgFee', parseInt(e.target.value))}
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={rate.crossBorderFee}
                                onChange={(e) => updateShippingRate(index, 'crossBorderFee', parseInt(e.target.value))}
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={rate.platformMarkupPercent}
                                onChange={(e) => updateShippingRate(index, 'platformMarkupPercent', parseFloat(e.target.value))}
                                className="w-20"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Zone Definitions</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge>LOCAL</Badge>
                        <span>Same city/region within the same country (1-2 days)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">DOMESTIC</Badge>
                        <span>Different city within the same country (2-4 days)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">REGIONAL</Badge>
                        <span>Neighboring country with shared border (3-7 days)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">CROSS_BORDER</Badge>
                        <span>Non-neighboring country (5-14 days)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button onClick={() => handleSaveSection('shipping', { rates: shippingRates })} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Shipping Rates
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Zone Matrix */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Country-to-Country Zone Matrix</CardTitle>
                  <CardDescription>
                    Defines which zone applies when shipping between countries.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">FROM → TO</th>
                          {COUNTRIES.map(c => (
                            <th key={c} className="text-center p-2">{c.slice(0, 2)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {COUNTRIES.map(from => (
                          <tr key={from} className="border-b">
                            <td className="font-medium p-2">{from}</td>
                            {COUNTRIES.map(to => (
                              <td key={to} className="text-center p-2">
                                <Badge variant={
                                  from === to ? 'default' :
                                  (from === 'UGANDA' && to === 'KENYA') || (from === 'KENYA' && to === 'UGANDA') ||
                                  (from === 'UGANDA' && to === 'RWANDA') || (from === 'RWANDA' && to === 'UGANDA') ||
                                  (from === 'KENYA' && to === 'TANZANIA') || (from === 'TANZANIA' && to === 'KENYA')
                                  ? 'secondary' : 'destructive'
                                } className="text-xs">
                                  {from === to ? 'LOCAL' :
                                   (from === 'UGANDA' && to === 'KENYA') || (from === 'KENYA' && to === 'UGANDA') ||
                                   (from === 'UGANDA' && to === 'RWANDA') || (from === 'RWANDA' && to === 'UGANDA') ||
                                   (from === 'KENYA' && to === 'TANZANIA') || (from === 'TANZANIA' && to === 'KENYA')
                                   ? 'REGIONAL' : 'CROSS'}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Zone matrix is pre-configured based on East African geography. Contact developer to modify.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Settings */}
            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <CardTitle>Flutterwave Configuration</CardTitle>
                  <CardDescription>
                    Configure your Flutterwave payment gateway for processing payments and seller payouts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">Configure Payment Gateway</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Add your Flutterwave keys to start accepting payments.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="publicKey">Public Key</Label>
                      <Input
                        id="publicKey"
                        placeholder="FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxx-X"
                        value={flutterwaveForm.publicKey}
                        onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, publicKey: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secretKey">Secret Key</Label>
                      <Input
                        id="secretKey"
                        type="password"
                        placeholder="FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxx-X"
                        value={flutterwaveForm.secretKey}
                        onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, secretKey: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">Never share your secret key. It's stored encrypted.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="encryptionKey">Encryption Key</Label>
                      <Input
                        id="encryptionKey"
                        placeholder="Your encryption key from Flutterwave dashboard"
                        value={flutterwaveForm.encryptionKey}
                        onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, encryptionKey: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="webhookSecret">Webhook Secret Hash</Label>
                      <Input
                        id="webhookSecret"
                        placeholder="Your webhook secret for verifying callbacks"
                        value={flutterwaveForm.webhookSecret}
                        onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, webhookSecret: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">How to get Flutterwave Keys</h4>
                    <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://dashboard.flutterwave.com" target="_blank" className="text-blue-500 hover:underline">Flutterwave Dashboard</a></li>
                      <li>Navigate to Settings → API Keys</li>
                      <li>Copy your Public Key, Secret Key, and Encryption Key</li>
                      <li>Set up a webhook endpoint and copy the secret hash</li>
                    </ol>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSection('flutterwave', flutterwaveForm)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Payment Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Currency Settings */}
            <TabsContent value="currency">
              <Card>
                <CardHeader>
                  <CardTitle>Exchange Rates</CardTitle>
                  <CardDescription>
                    Set the exchange rates for currency conversion. These are used to display prices in buyer's local currency.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Last updated: {exchangeRates.lastUpdated ? new Date(exchangeRates.lastUpdated).toLocaleString() : 'Never'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      toast({ title: 'Rates Refreshed', description: 'Using cached rates. Add Open Exchange Rates API for live rates.' })
                    }}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Rates
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-medium">UGX Rates</h4>
                      <div className="space-y-2">
                        <Label>UGX to KES</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={exchangeRates.UGX_TO_KES || ''}
                          onChange={(e) => setExchangeRates({ ...exchangeRates, UGX_TO_KES: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UGX to TZS</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={exchangeRates.UGX_TO_TZS || ''}
                          onChange={(e) => setExchangeRates({ ...exchangeRates, UGX_TO_TZS: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UGX to RWF</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={exchangeRates.UGX_TO_RWF || ''}
                          onChange={(e) => setExchangeRates({ ...exchangeRates, UGX_TO_RWF: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">KES Rates</h4>
                      <div className="space-y-2">
                        <Label>KES to UGX</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={exchangeRates.KES_TO_UGX || ''}
                          onChange={(e) => setExchangeRates({ ...exchangeRates, KES_TO_UGX: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>KES to TZS</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={exchangeRates.KES_TO_TZS || ''}
                          onChange={(e) => setExchangeRates({ ...exchangeRates, KES_TO_TZS: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>KES to RWF</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={exchangeRates.KES_TO_RWF || ''}
                          onChange={(e) => setExchangeRates({ ...exchangeRates, KES_TO_RWF: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Pro Tip: Live Exchange Rates
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      For automatic rate updates, integrate with Open Exchange Rates API (free tier: 1,000 requests/month).
                      Flutterwave also provides live rates during payment processing.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSection('exchangeRates', exchangeRates)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Exchange Rates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
