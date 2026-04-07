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
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AccessDeniedPage } from '@/components/admin/access-denied-page'
import { MobileNav, DesktopSidebar, BottomNav } from '@/components/dashboard/mobile-nav'
import { adminNavItems } from '@/lib/admin-nav'

const COUNTRIES = ['UGANDA', 'KENYA', 'TANZANIA', 'RWANDA']

interface PlatformSettings {
  commission: {
    defaultRate: number
    shippingMarkupPercent: number
  }
  pesapal: {
    clientId: string
    clientSecret: string
    ipnId: string
    environment: string
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
  const [pesapalForm, setPesapalForm] = useState({
    clientId: '',
    clientSecret: '',
    ipnId: '',
    environment: 'sandbox',
  })
  const [shippingRates, setShippingRates] = useState<any[]>([])
  const [exchangeRates, setExchangeRates] = useState<any>({})
  const [testingConnection, setTestingConnection] = useState(false)
  const [payoutForm, setPayoutForm] = useState({
    method: '',
    phone: '',
    bankName: '',
    bankAccount: '',
    country: 'UGANDA',
  })

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
      setPesapalForm(settingsData.settings.pesapal || { clientId: '', clientSecret: '', ipnId: '', environment: 'sandbox' })
      setShippingRates(settingsData.settings.shipping?.rates?.length > 0 
        ? settingsData.settings.shipping.rates 
        : getDefaultShippingRates())
      setExchangeRates(settingsData.settings.exchangeRates || {})
      if (settingsData.settings.payout) {
        setPayoutForm(settingsData.settings.payout)
      }
    }
  }, [settingsData])

  // Show access denied if not admin (don't redirect - stay on access denied page)
  // This prevents redirecting to the wrong dashboard

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

  // Loading state
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not authorized - show access denied page
  if (!roleData?.user?.isAdmin) {
    return (
      <AccessDeniedPage 
        reason="unauthorized"
        message="This administrative portal is exclusively for authorized DuukaAfrica administrators. Your access attempt has been logged and monitored. If you believe this is an error, please contact the system administrator."
      />
    )
  }

  // Loading settings
  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
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
              <h2 className="text-lg md:text-xl font-semibold">Platform Settings</h2>
              <p className="text-sm text-gray-500 hidden sm:block">Configure commission, shipping, payments, and more</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500 hidden sm:block" />
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                {roleData?.user?.email || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="commission" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                <span className="hidden sm:inline">Commission</span>
              </TabsTrigger>
              <TabsTrigger value="shipping" className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">Shipping</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Payment</span>
              </TabsTrigger>
              <TabsTrigger value="payout" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span className="hidden sm:inline">Payouts</span>
              </TabsTrigger>
              <TabsTrigger value="currency" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span className="hidden sm:inline">Currency</span>
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
                  <CardTitle>Pesapal Configuration</CardTitle>
                  <CardDescription>
                    Configure your Pesapal payment gateway for processing payments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${pesapalForm.clientId && pesapalForm.clientSecret ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <div>
                        <p className="font-medium">Payment Gateway Status</p>
                        <p className="text-sm text-gray-500">
                          {pesapalForm.clientId && pesapalForm.clientSecret 
                            ? 'Configured' 
                            : 'Not configured - Add keys below'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={pesapalForm.environment === 'production' ? 'default' : 'secondary'}>
                      {pesapalForm.environment === 'production' ? 'Production' : 'Sandbox'}
                    </Badge>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="psClientId">Client ID (Consumer Key)</Label>
                      <Input
                        id="psClientId"
                        placeholder="Your Pesapal Client ID"
                        value={pesapalForm.clientId}
                        onChange={(e) => setPesapalForm({ ...pesapalForm, clientId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="psClientSecret">Client Secret (Consumer Secret)</Label>
                      <Input
                        id="psClientSecret"
                        type="password"
                        placeholder="Your Pesapal Client Secret"
                        value={pesapalForm.clientSecret}
                        onChange={(e) => setPesapalForm({ ...pesapalForm, clientSecret: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">Never share your client secret. It's stored encrypted.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="psIpnId">IPN ID (Instant Payment Notification)</Label>
                      <Input
                        id="psIpnId"
                        placeholder="Your Pesapal IPN ID"
                        value={pesapalForm.ipnId}
                        onChange={(e) => setPesapalForm({ ...pesapalForm, ipnId: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">This is used to receive payment notifications from Pesapal.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="psEnvironment">Environment</Label>
                      <select
                        id="psEnvironment"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                        value={pesapalForm.environment}
                        onChange={(e) => setPesapalForm({ ...pesapalForm, environment: e.target.value })}
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                      <p className="text-xs text-gray-500">Use sandbox for testing, switch to production for live payments.</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">How to get Pesapal Credentials</h4>
                    <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://pay.pesapal.com" target="_blank" className="text-blue-500 hover:underline">Pesapal Dashboard</a></li>
                      <li>Create an account or log in</li>
                      <li>Navigate to Integration → API Settings</li>
                      <li>Copy your Consumer Key and Consumer Secret</li>
                      <li>Register an IPN URL: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/pesapal/ipn</code></li>
                    </ol>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSection('pesapal', pesapalForm)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Payment Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payout Settings */}
            <TabsContent value="payout">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Payout Configuration</CardTitle>
                  <CardDescription>
                    Configure how sellers receive payouts. When you process a payout manually, these details are used as a reference. Each seller can also set their own payout method in their seller settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payout Method */}
                  <div className="space-y-2">
                    <Label htmlFor="payoutMethod">Payout Method</Label>
                    <select
                      id="payoutMethod"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                      value={payoutForm.method}
                      onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })}
                    >
                      <option value="">Select method...</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      This is YOUR (admin/platform) payout method for receiving platform earnings.
                    </p>
                  </div>

                  {/* Mobile Money Fields */}
                  {payoutForm.method === 'MOBILE_MONEY' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="payoutPhone">Mobile Money Phone Number</Label>
                        <Input
                          id="payoutPhone"
                          type="tel"
                          placeholder="+256 7XX XXX XXX"
                          value={payoutForm.phone}
                          onChange={(e) => setPayoutForm({ ...payoutForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payoutCountry">Country</Label>
                        <select
                          id="payoutCountry"
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                          value={payoutForm.country}
                          onChange={(e) => setPayoutForm({ ...payoutForm, country: e.target.value })}
                        >
                          <option value="UGANDA">Uganda</option>
                          <option value="KENYA">Kenya</option>
                          <option value="TANZANIA">Tanzania</option>
                          <option value="RWANDA">Rwanda</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer Fields */}
                  {payoutForm.method === 'BANK_TRANSFER' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          placeholder="e.g. Stanbic Bank Uganda"
                          value={payoutForm.bankName}
                          onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Account Number</Label>
                        <Input
                          id="bankAccount"
                          placeholder="e.g. 003XXXXXXXXX"
                          value={payoutForm.bankAccount}
                          onChange={(e) => setPayoutForm({ ...payoutForm, bankAccount: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      Important: Manual Payout Process
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      With Pesapal, ALL customer payments go to your platform account first. You keep your commission
                      and shipping markup, then manually send the seller their share via mobile money or bank transfer.
                      Use the Admin Payout Queue (under Payouts) to process seller withdrawals. Always confirm amounts
                      before sending.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSection('payout', payoutForm)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Payout Settings
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
                      Pesapal also handles live rates during payment processing.
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

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={adminNavItems} />
      </main>
    </div>
  )
}
