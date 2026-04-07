'use client'


import { useUser } from '@clerk/nextjs'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings,
  Store,
  Truck,
  Wallet,
  Image,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building,
  MapPin,
  Globe,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const COUNTRIES = [
  { code: 'UGANDA', name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  { code: 'KENYA', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'TANZANIA', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { code: 'RWANDA', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
]

const MOBILE_MONEY_PROVIDERS: Record<string, { id: string, name: string }[]> = {
  UGANDA: [
    { id: 'MTN', name: 'MTN Mobile Money' },
    { id: 'AIRTEL', name: 'Airtel Money' }
  ],
  KENYA: [
    { id: 'MPESA', name: 'M-Pesa' },
    { id: 'AIRTEL', name: 'Airtel Money' }
  ],
  TANZANIA: [
    { id: 'VODACOM', name: 'M-Pesa (Vodacom)' },
    { id: 'AIRTEL', name: 'Airtel Money' },
    { id: 'TIGO', name: 'Tigo Pesa' }
  ],
  RWANDA: [
    { id: 'MTN', name: 'MTN Mobile Money' },
    { id: 'AIRTEL', name: 'Airtel Money' }
  ],
}

interface Bank {
  code: string
  name: string
  id: number
}

interface StoreSettings {
  store: {
    id: string
    name: string
    slug: string
    description: string | null
    logo: string | null
    banner: string | null
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    region: string | null
    country: string
    isVerified: boolean
    commissionRate: number
  }
  shipping: {
    shipsToCountries: string[]
  }
  payout: {
    method: string
    phone: string
    mobileProvider: string
    bankName: string
    bankCode: string
    bankAccount: string
  }
  balances: {
    available: number
    pending: number
    currency: string
  }
}

export default function SellerSettingsPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('store')
  const [settings, setSettings] = useState<StoreSettings | null>(null)

  // Form states
  const [storeForm, setStoreForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
  })
  const [shippingForm, setShippingForm] = useState({
    shipsToCountries: [] as string[],
  })
  const [payoutForm, setPayoutForm] = useState({
    method: '',
    phone: '',
    mobileProvider: '',
    bankName: '',
    bankCode: '',
    bankAccount: '',
  })
  const [imagesForm, setImagesForm] = useState({
    logo: '',
    banner: '',
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload')
  const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload')
  const [banks, setBanks] = useState<Bank[]>([])
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Read URL params to set active tab (e.g., ?payout=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const payoutParam = params.get('payout')
    
    if (tabParam === 'payout' || payoutParam === 'true') {
      setActiveTab('payout')
    } else if (tabParam === 'shipping') {
      setActiveTab('shipping')
    } else if (tabParam === 'images') {
      setActiveTab('images')
    } else if (tabParam === 'store') {
      setActiveTab('store')
    }
  }, [])

  // Fetch banks when payout method changes to bank transfer
  useEffect(() => {
    if (payoutForm.method === 'BANK_TRANSFER' && settings?.store.country) {
      fetchBanks(settings.store.country)
    }
  }, [payoutForm.method, settings?.store.country])

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role || user.unsafeMetadata?.role
      if (role !== 'SELLER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        router.push('/dashboard')
      } else {
        fetchSettings()
      }
    }
  }, [isLoaded, user, router])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/seller/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        setStoreForm({
          name: data.settings.store.name,
          description: data.settings.store.description || '',
          phone: data.settings.store.phone || '',
          email: data.settings.store.email || '',
          address: data.settings.store.address || '',
          city: data.settings.store.city || '',
          region: data.settings.store.region || '',
        })
        setShippingForm({
          shipsToCountries: data.settings.shipping.shipsToCountries,
        })
        setPayoutForm({
          method: data.settings.payout.method || '',
          phone: data.settings.payout.phone || '',
          mobileProvider: data.settings.payout.mobileProvider || '',
          bankName: data.settings.payout.bankName || '',
          bankCode: data.settings.payout.bankCode || '',
          bankAccount: data.settings.payout.bankAccount || '',
        })
        setImagesForm({
          logo: data.settings.store.logo || '',
          banner: data.settings.store.banner || '',
        })
        
        // Fetch banks if bank transfer method is selected
        if (data.settings.payout.method === 'BANK_TRANSFER') {
          fetchBanks(data.settings.store.country)
        }
      } else if (res.status === 404) {
        const data = await res.json()
        if (data.needsOnboarding) {
          router.push('/seller/onboarding')
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchBanks(country: string) {
    setLoadingBanks(true)
    try {
      // Bank list fetching removed with payment provider migration
      // Banks are now managed by admin for manual payouts
      setBanks([])
    } catch (error) {
      console.error('Error fetching banks:', error)
    } finally {
      setLoadingBanks(false)
    }
  }

  async function saveSection(section: string, data: any) {
    setIsSaving(true)
    try {
      const res = await fetch('/api/seller/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data }),
      })

      if (res.ok) {
        toast({
          title: 'Settings Saved',
          description: `${section} settings have been updated successfully.`,
        })
        fetchSettings()
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function toggleCountry(countryCode: string) {
    const current = shippingForm.shipsToCountries
    if (current.includes(countryCode)) {
      setShippingForm({
        ...shippingForm,
        shipsToCountries: current.filter(c => c !== countryCode),
      })
    } else {
      setShippingForm({
        ...shippingForm,
        shipsToCountries: [...current, countryCode],
      })
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/seller" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Store Settings</h1>
              <p className="text-sm text-gray-500">Manage your store profile, shipping, and payouts</p>
            </div>
          </div>
          {settings?.store.isVerified ? (
            <Badge className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Verified Store
            </Badge>
          ) : (
            <Badge variant="secondary">
              Pending Verification
            </Badge>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Store Profile
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Store Images
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Shipping
            </TabsTrigger>
            <TabsTrigger value="payout" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Payouts
            </TabsTrigger>
          </TabsList>

          {/* Store Profile */}
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>
                  Update your store's public information that buyers will see.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Store Name</Label>
                    <Input
                      id="name"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Store URL</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">duukaafrica.com/stores/</span>
                      <Input
                        id="slug"
                        value={settings?.store.slug}
                        disabled
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Store Description</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    placeholder="Tell buyers about your store..."
                    value={storeForm.description}
                    onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+256 700 123 456"
                      value={storeForm.phone}
                      onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="store@example.com"
                      value={storeForm.email}
                      onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Business Location</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Kampala"
                        value={storeForm.city}
                        onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region/State</Label>
                      <Input
                        id="region"
                        placeholder="Central"
                        value={storeForm.region}
                        onChange={(e) => setStoreForm({ ...storeForm, region: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={settings?.store.country} disabled>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      value={storeForm.address}
                      onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveSection('store', storeForm)} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Store Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Store Images */}
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle>Store Images</CardTitle>
                <CardDescription>
                  Upload your store logo and banner image. These will be displayed on your store page and in search results.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Logo Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Store Logo</Label>
                      <p className="text-sm text-gray-500">A square image representing your store (recommended: 200x200px)</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={logoInputMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLogoInputMode('upload')}
                      >
                        Upload File
                      </Button>
                      <Button
                        type="button"
                        variant={logoInputMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLogoInputMode('url')}
                      >
                        Enter URL
                      </Button>
                    </div>
                  </div>
                  
                  {/* Logo Preview */}
                  {imagesForm.logo && (
                    <div className="w-24 h-24 rounded-lg border overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img 
                        src={imagesForm.logo} 
                        alt="Logo preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {logoInputMode === 'upload' ? (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingLogo(true)
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            formData.append('folder', 'store-logos')
                            const res = await fetch('/api/upload', {
                              method: 'POST',
                              body: formData,
                            })
                            if (res.ok) {
                              const data = await res.json()
                              setImagesForm({ ...imagesForm, logo: data.url })
                            }
                          } catch (error) {
                            console.error('Upload error:', error)
                          } finally {
                            setUploadingLogo(false)
                          }
                        }}
                        disabled={uploadingLogo}
                      />
                      {uploadingLogo && <p className="text-sm text-gray-500">Uploading...</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={imagesForm.logo}
                        onChange={(e) => setImagesForm({ ...imagesForm, logo: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">Enter the full URL of your logo image</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Banner Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Store Banner</Label>
                      <p className="text-sm text-gray-500">A wide banner image for your store page (recommended: 1200x300px)</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={bannerInputMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBannerInputMode('upload')}
                      >
                        Upload File
                      </Button>
                      <Button
                        type="button"
                        variant={bannerInputMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBannerInputMode('url')}
                      >
                        Enter URL
                      </Button>
                    </div>
                  </div>
                  
                  {/* Banner Preview */}
                  {imagesForm.banner && (
                    <div className="w-full h-32 rounded-lg border overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img 
                        src={imagesForm.banner} 
                        alt="Banner preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {bannerInputMode === 'upload' ? (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingBanner(true)
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            formData.append('folder', 'store-banners')
                            const res = await fetch('/api/upload', {
                              method: 'POST',
                              body: formData,
                            })
                            if (res.ok) {
                              const data = await res.json()
                              setImagesForm({ ...imagesForm, banner: data.url })
                            }
                          } catch (error) {
                            console.error('Upload error:', error)
                          } finally {
                            setUploadingBanner(false)
                          }
                        }}
                        disabled={uploadingBanner}
                      />
                      {uploadingBanner && <p className="text-sm text-gray-500">Uploading...</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/banner.png"
                        value={imagesForm.banner}
                        onChange={(e) => setImagesForm({ ...imagesForm, banner: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">Enter the full URL of your banner image</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={async () => {
                      setIsSaving(true)
                      try {
                        const res = await fetch('/api/seller/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ section: 'images', data: imagesForm }),
                        })
                        if (res.ok) {
                          toast({ title: 'Images Saved', description: 'Store images have been updated successfully.' })
                          fetchSettings()
                        } else {
                          throw new Error('Failed to save')
                        }
                      } catch (error) {
                        toast({ title: 'Error', description: 'Failed to save images.', variant: 'destructive' })
                      } finally {
                        setIsSaving(false)
                      }
                    }} 
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Store Images
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Settings */}
          <TabsContent value="shipping">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Preferences</CardTitle>
                <CardDescription>
                  Configure where you can ship your products. Cross-border shipping uses bus parcel services.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    How Cross-Border Shipping Works
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    When you enable shipping to other countries, buyers from those countries can purchase your products.
                    You'll coordinate delivery through bus parcel services (Modern Coast, Mash, etc.).
                    The platform calculates shipping fees automatically based on distance and weight.
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Countries You Ship To</Label>
                  <p className="text-sm text-gray-500">
                    Select all countries where you can deliver products. Your own country is always included.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {COUNTRIES.map(country => {
                      const isOwnCountry = country.code === settings?.store.country
                      const isSelected = shippingForm.shipsToCountries.includes(country.code) || isOwnCountry
                      return (
                        <div
                          key={country.code}
                          className={`flex items-center gap-3 p-4 rounded-lg border ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'
                          }`}
                        >
                          <Checkbox
                            id={`country-${country.code}`}
                            checked={isSelected}
                            disabled={isOwnCountry}
                            onCheckedChange={() => toggleCountry(country.code)}
                          />
                          <label htmlFor={`country-${country.code}`} className="flex-1 cursor-pointer">
                            <span className="text-2xl mr-2">{country.flag}</span>
                            <span className="font-medium">{country.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({country.currency})</span>
                            {isOwnCountry && (
                              <Badge variant="secondary" className="ml-2 text-xs">Your country</Badge>
                            )}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    Shipping Zones & Rates
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Shipping rates are set by the platform and calculated automatically:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• <strong>LOCAL</strong>: Same country (lowest rate)</li>
                    <li>• <strong>REGIONAL</strong>: Neighboring country (medium rate)</li>
                    <li>• <strong>CROSS_BORDER</strong>: Non-neighboring country (highest rate)</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveSection('shipping', shippingForm)} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Shipping Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payout Settings */}
          <TabsContent value="payout">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Balance Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Balance</CardTitle>
                  <CardDescription>Available for withdrawal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-green-600">
                      {settings?.balances.currency} {settings?.balances.available.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Available</p>
                  </div>
                  <Separator />
                  <div className="text-center py-2">
                    <p className="text-xl font-semibold text-yellow-600">
                      {settings?.balances.currency} {settings?.balances.pending.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Pending Settlement</p>
                  </div>
                  <Link href="/seller/payouts">
                    <Button className="w-full" variant="outline">
                      View Payout History
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Payout Method */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Payout Method</CardTitle>
                  <CardDescription>
                    Choose how you want to receive your earnings. Payouts are processed manually by the admin within 1-3 business days.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  <div className="space-y-2">
                    <Label>Payout Method</Label>
                    <Select
                      value={payoutForm.method}
                      onValueChange={(value) => setPayoutForm({ ...payoutForm, method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payout method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MOBILE_MONEY">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Mobile Money
                          </div>
                        </SelectItem>
                        <SelectItem value="BANK_TRANSFER">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Bank Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {payoutForm.method === 'MOBILE_MONEY' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Mobile Money Provider</Label>
                        <Select
                          value={payoutForm.mobileProvider}
                          onValueChange={(value) => setPayoutForm({ ...payoutForm, mobileProvider: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {(MOBILE_MONEY_PROVIDERS[settings?.store.country || 'UGANDA'] || MOBILE_MONEY_PROVIDERS['UGANDA']).map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile Money Number</Label>
                        <Input
                          placeholder={settings?.store.country === 'KENYA' ? "+254 7XX XXX XXX" : settings?.store.country === 'TANZANIA' ? "+255 7XX XXX XXX" : settings?.store.country === 'RWANDA' ? "+250 7XX XXX XXX" : "+256 7XX XXX XXX"}
                          value={payoutForm.phone}
                          onChange={(e) => setPayoutForm({ ...payoutForm, phone: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">Enter the number registered with your mobile money account</p>
                      </div>
                    </div>
                  )}

                  {payoutForm.method === 'BANK_TRANSFER' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Bank</Label>
                        {loadingBanks ? (
                          <div className="flex items-center gap-2 p-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-gray-500">Loading banks...</span>
                          </div>
                        ) : (
                          <Select
                            value={payoutForm.bankCode}
                            onValueChange={(value) => {
                              const selectedBank = banks.find(b => b.code === value)
                              setPayoutForm({ 
                                ...payoutForm, 
                                bankCode: value,
                                bankName: selectedBank?.name || ''
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select your bank" />
                            </SelectTrigger>
                            <SelectContent>
                              {banks.map((bank) => (
                                <SelectItem key={bank.code} value={bank.code}>
                                  {bank.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          placeholder="1234567890"
                          value={payoutForm.bankAccount}
                          onChange={(e) => setPayoutForm({ ...payoutForm, bankAccount: e.target.value })}
                        />
                      </div>
                      {payoutForm.bankName && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                          <p className="text-sm">
                            <strong>Selected Bank:</strong> {payoutForm.bankName}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Commission Rate</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your platform commission: <strong>{settings?.store.commissionRate}%</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      This percentage is deducted from each sale. Contact admin for rate adjustments.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => saveSection('payout', payoutForm)} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Payout Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
