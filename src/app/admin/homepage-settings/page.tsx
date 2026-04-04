'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  Users,
  Store,
  Package,
  ShoppingCart,
  Shield,
  Settings,
  Loader2,
  Save,
  AlertCircle,
  Layout,
  MessageSquare,
  Phone,
  Share2,
  Globe,
  Eye,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AccessDeniedPage } from '@/components/admin/access-denied-page'

const sidebarLinks = [
  { href: '/admin', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/categories', icon: Settings, label: 'Categories' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
  { href: '/admin/homepage-settings', icon: Layout, label: 'Homepage' },
]

async function fetchHomepageSettings() {
  const res = await fetch('/api/admin/homepage-settings')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function saveHomepageSettings(data: { key?: string; value?: any; settings?: Record<string, any> }) {
  const res = await fetch('/api/admin/homepage-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save')
  return res.json()
}

export default function AdminHomepageSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('contact')

  // Forms
  const [contactForm, setContactForm] = useState<Record<string, string>>({})
  const [socialForm, setSocialForm] = useState<Record<string, string>>({})
  const [sectionToggles, setSectionToggles] = useState<Record<string, boolean>>({})
  const [howItWorksTitle, setHowItWorksTitle] = useState('')
  const [howItWorksSubtitle, setHowItWorksSubtitle] = useState('')
  const [howItWorksSteps, setHowItWorksSteps] = useState<Array<{ icon: string; title: string; description: string }>>([])
  const [trustIndicators, setTrustIndicators] = useState<Array<{ emoji: string; text: string }>>([])
  const [tickerEnabled, setTickerEnabled] = useState(false)
  const [tickerInterval, setTickerInterval] = useState('5')
  const [sellerCtaForm, setSellerCtaForm] = useState<Record<string, string>>({})
  const [sellerBenefits, setSellerBenefits] = useState<Array<{ title: string; description: string }>>([])
  const [newsletterTitle, setNewsletterTitle] = useState('')
  const [newsletterSubtitle, setNewsletterSubtitle] = useState('')
  const [footerAbout, setFooterAbout] = useState('')
  const [footerCopyright, setFooterCopyright] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [newPaymentMethod, setNewPaymentMethod] = useState('')

  // Role check
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
    queryKey: ['admin-homepage-settings'],
    queryFn: fetchHomepageSettings,
    enabled: !!roleData?.user?.isAdmin,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: saveHomepageSettings,
    onSuccess: () => {
      toast({ title: 'Saved', description: 'Homepage settings updated successfully.' })
      queryClient.invalidateQueries({ queryKey: ['admin-homepage-settings'] })
      queryClient.invalidateQueries({ queryKey: ['homepage-settings'] })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save. Try again.', variant: 'destructive' })
    },
  })

  // Populate forms when data loads
  useEffect(() => {
    if (!settingsData?.settings) return
    const s = settingsData.settings

    // Contact
    setContactForm({
      contact_phone: s.homepage_contact?.contact_phone || '',
      contact_email: s.homepage_contact?.contact_email || '',
      contact_whatsapp: s.homepage_contact?.contact_whatsapp || '',
      contact_address: s.homepage_contact?.contact_address || '',
    })

    // Social
    setSocialForm({
      social_facebook: s.homepage_social?.social_facebook || '',
      social_twitter: s.homepage_social?.social_twitter || '',
      social_instagram: s.homepage_social?.social_instagram || '',
      social_youtube: s.homepage_social?.social_youtube || '',
    })

    // Sections
    const sec = s.homepage_sections || {}
    setSectionToggles(
      Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, v === true])),
    )

    // How It Works
    const hiw = s.homepage_how_it_works || {}
    setHowItWorksTitle(hiw.how_it_works_title || '')
    setHowItWorksSubtitle(hiw.how_it_works_subtitle || '')
    setHowItWorksSteps(hiw.how_it_works_steps || [])

    // Trust Indicators
    setTrustIndicators(s.homepage_trust?.trust_indicators || [])

    // Ticker
    const tk = s.homepage_ticker || {}
    setTickerEnabled(tk.ticker_enabled === true)
    setTickerInterval(String(tk.ticker_interval_seconds || 5))

    // Seller CTA
    const sc = s.homepage_seller_cta || {}
    setSellerCtaForm({
      seller_cta_badge: sc.seller_cta_badge || '',
      seller_cta_title_1: sc.seller_cta_title_1 || '',
      seller_cta_title_highlight: sc.seller_cta_title_highlight || '',
      seller_cta_description: sc.seller_cta_description || '',
    })
    setSellerBenefits(sc.seller_cta_benefits || [])

    // Newsletter
    const nl = s.homepage_newsletter || {}
    setNewsletterTitle(nl.newsletter_title || '')
    setNewsletterSubtitle(nl.newsletter_subtitle || '')

    // Footer
    const ft = s.homepage_footer || {}
    setFooterAbout(ft.footer_about || '')
    setFooterCopyright(ft.footer_copyright || '')

    // Payment
    setPaymentMethods(s.homepage_payment?.payment_methods || [])
  }, [settingsData])

  const handleSaveSection = (groupSettings: Record<string, any>) => {
    saveMutation.mutate({ settings: groupSettings })
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!roleData?.user?.isAdmin) {
    return (
      <AccessDeniedPage
        reason="unauthorized"
        message="This administrative portal is exclusively for authorized DuukaAfrica administrators."
      />
    )
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const isSaving = saveMutation.isPending

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
                link.href === '/admin/homepage-settings'
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
        <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Homepage Settings</h2>
              <p className="text-sm text-gray-500">
                Configure homepage sections, contact info, trust indicators, and more
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {roleData?.user?.email || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="contact" className="flex items-center gap-1 text-xs">
                <Phone className="w-3.5 h-3.5" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="sections" className="flex items-center gap-1 text-xs">
                <Eye className="w-3.5 h-3.5" />
                Sections
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1 text-xs">
                <Layout className="w-3.5 h-3.5" />
                Content
              </TabsTrigger>
              <TabsTrigger value="trust" className="flex items-center gap-1 text-xs">
                <Shield className="w-3.5 h-3.5" />
                Trust
              </TabsTrigger>
              <TabsTrigger value="footer" className="flex items-center gap-1 text-xs">
                <Globe className="w-3.5 h-3.5" />
                Footer
              </TabsTrigger>
            </TabsList>

            {/* ── CONTACT & SOCIAL ── */}
            <TabsContent value="contact">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Contact Information
                    </CardTitle>
                    <CardDescription>
                      Phone, email, and address shown on the footer and contact page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={contactForm.contact_phone || ''}
                        onChange={(e) => setContactForm({ ...contactForm, contact_phone: e.target.value })}
                        placeholder="+256 700 000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input
                        type="email"
                        value={contactForm.contact_email || ''}
                        onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })}
                        placeholder="support@duukaafrica.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp Number</Label>
                      <Input
                        value={contactForm.contact_whatsapp || ''}
                        onChange={(e) => setContactForm({ ...contactForm, contact_whatsapp: e.target.value })}
                        placeholder="+256 700 000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input
                        value={contactForm.contact_address || ''}
                        onChange={(e) => setContactForm({ ...contactForm, contact_address: e.target.value })}
                        placeholder="Kampala, Uganda"
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveSection(contactForm)}
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Contact Info
                    </Button>
                  </CardContent>
                </Card>

                {/* Social */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      Social Media Links
                    </CardTitle>
                    <CardDescription>
                      Social media profiles linked from the footer.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Facebook</Label>
                      <Input
                        value={socialForm.social_facebook || ''}
                        onChange={(e) => setSocialForm({ ...socialForm, social_facebook: e.target.value })}
                        placeholder="https://facebook.com/duukaafrica"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Twitter / X</Label>
                      <Input
                        value={socialForm.social_twitter || ''}
                        onChange={(e) => setSocialForm({ ...socialForm, social_twitter: e.target.value })}
                        placeholder="https://twitter.com/duukaafrica"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <Input
                        value={socialForm.social_instagram || ''}
                        onChange={(e) => setSocialForm({ ...socialForm, social_instagram: e.target.value })}
                        placeholder="https://instagram.com/duukaafrica"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>YouTube</Label>
                      <Input
                        value={socialForm.social_youtube || ''}
                        onChange={(e) => setSocialForm({ ...socialForm, social_youtube: e.target.value })}
                        placeholder="https://youtube.com/duukaafrica"
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveSection(socialForm)}
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Social Links
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── SECTION VISIBILITY ── */}
            <TabsContent value="sections">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Homepage Section Visibility
                  </CardTitle>
                  <CardDescription>
                    Toggle sections on/off. Changes appear instantly on the homepage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { key: 'section_hero_visible', label: 'Hero Section', desc: 'Main hero banner with carousel' },
                      { key: 'section_trust_bar_visible', label: 'Trust Indicators Bar', desc: 'Compact trust badges below hero' },
                      { key: 'section_how_it_works_visible', label: 'How It Works', desc: '4-step process explainer' },
                      { key: 'section_ticker_visible', label: 'Live Pulse Ticker', desc: 'Real-time purchase activity bar' },
                      { key: 'section_categories_visible', label: 'Categories Grid', desc: 'Featured categories bento grid' },
                      { key: 'section_featured_visible', label: 'Featured Products', desc: 'Product carousel' },
                      { key: 'section_flash_sales_visible', label: 'Flash Sales', desc: 'Flash deals countdown section' },
                      { key: 'section_trust_section_visible', label: 'Trust & Stats Section', desc: 'Detailed trust features + stats' },
                      { key: 'section_seller_showcase_visible', label: 'Seller Showcase', desc: 'Featured sellers grid' },
                      { key: 'section_seller_cta_visible', label: 'Seller CTA', desc: 'Become a Seller call-to-action' },
                    ].map((section) => (
                      <div
                        key={section.key}
                        className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-800"
                      >
                        <div>
                          <p className="font-medium">{section.label}</p>
                          <p className="text-sm text-gray-500">{section.desc}</p>
                        </div>
                        <Switch
                          checked={sectionToggles[section.key] !== false}
                          onCheckedChange={(checked) => {
                            setSectionToggles((prev) => ({ ...prev, [section.key]: checked }))
                            handleSaveSection({ [section.key]: checked })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── CONTENT: How It Works + Ticker + Seller CTA ── */}
            <TabsContent value="content">
              <div className="grid gap-6 md:grid-cols-2">
                {/* How It Works */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      How It Works Section
                    </CardTitle>
                    <CardDescription>4 steps that explain your process to visitors.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={howItWorksTitle}
                        onChange={(e) => setHowItWorksTitle(e.target.value)}
                        placeholder="How DukaAfrica Works"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input
                        value={howItWorksSubtitle}
                        onChange={(e) => setHowItWorksSubtitle(e.target.value)}
                        placeholder="Simple, safe, and secure shopping in 4 easy steps"
                      />
                    </div>

                    <Separator />
                    <p className="text-sm font-medium">Steps ({howItWorksSteps.length}/4)</p>

                    {howItWorksSteps.map((step, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Step {i + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHowItWorksSteps((prev) => prev.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                        <Input
                          value={step.icon}
                          onChange={(e) => {
                            const updated = [...howItWorksSteps]
                            updated[i] = { ...updated[i], icon: e.target.value }
                            setHowItWorksSteps(updated)
                          }}
                          placeholder="Icon name (Shield, Truck, Search...)"
                          className="text-sm"
                        />
                        <Input
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...howItWorksSteps]
                            updated[i] = { ...updated[i], title: e.target.value }
                            setHowItWorksSteps(updated)
                          }}
                          placeholder="Step title"
                        />
                        <Input
                          value={step.description}
                          onChange={(e) => {
                            const updated = [...howItWorksSteps]
                            updated[i] = { ...updated[i], description: e.target.value }
                            setHowItWorksSteps(updated)
                          }}
                          placeholder="Step description"
                          className="text-sm"
                        />
                      </div>
                    ))}

                    {howItWorksSteps.length < 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setHowItWorksSteps((prev) => [
                            ...prev,
                            { icon: 'CheckCircle', title: '', description: '' },
                          ])
                        }
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Step
                      </Button>
                    )}

                    <Button
                      onClick={() =>
                        handleSaveSection({
                          how_it_works_title: howItWorksTitle,
                          how_it_works_subtitle: howItWorksSubtitle,
                          how_it_works_steps: howItWorksSteps,
                        })
                      }
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save How It Works
                    </Button>
                  </CardContent>
                </Card>

                {/* Ticker + Seller CTA */}
                <div className="space-y-6">
                  {/* Ticker */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Live Pulse Ticker
                      </CardTitle>
                      <CardDescription>
                        Shows recent purchase activity on the homepage.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-800">
                        <div>
                          <p className="font-medium">Enable Ticker</p>
                          <p className="text-sm text-gray-500">
                            {tickerEnabled
                              ? 'Showing live activity on homepage'
                              : 'Ticker is hidden'}
                          </p>
                        </div>
                        <Switch
                          checked={tickerEnabled}
                          onCheckedChange={(checked) => {
                            setTickerEnabled(checked)
                            handleSaveSection({ ticker_enabled: checked })
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rotation Interval (seconds)</Label>
                        <Input
                          type="number"
                          min="3"
                          max="30"
                          value={tickerInterval}
                          onChange={(e) => setTickerInterval(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">How often messages rotate. Recommended: 5s</p>
                      </div>
                      <Button
                        onClick={() =>
                          handleSaveSection({
                            ticker_interval_seconds: Number(tickerInterval),
                          })
                        }
                        disabled={isSaving}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-1" /> Save
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Seller CTA */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Seller CTA Section</CardTitle>
                      <CardDescription>Customize the Become a Seller section.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Badge Text</Label>
                        <Input
                          value={sellerCtaForm.seller_cta_badge || ''}
                          onChange={(e) =>
                            setSellerCtaForm({ ...sellerCtaForm, seller_cta_badge: e.target.value })
                          }
                          placeholder="Now accepting sellers..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Title Line 1</Label>
                          <Input
                            value={sellerCtaForm.seller_cta_title_1 || ''}
                            onChange={(e) =>
                              setSellerCtaForm({ ...sellerCtaForm, seller_cta_title_1: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Title Highlight</Label>
                          <Input
                            value={sellerCtaForm.seller_cta_title_highlight || ''}
                            onChange={(e) =>
                              setSellerCtaForm({ ...sellerCtaForm, seller_cta_title_highlight: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={sellerCtaForm.seller_cta_description || ''}
                          onChange={(e) =>
                            setSellerCtaForm({ ...sellerCtaForm, seller_cta_description: e.target.value })
                          }
                        />
                      </div>

                      <Separator />
                      <p className="text-sm font-medium">Benefits ({sellerBenefits.length})</p>

                      {sellerBenefits.map((b, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={b.title}
                            onChange={(e) => {
                              const u = [...sellerBenefits]
                              u[i] = { ...u[i], title: e.target.value }
                              setSellerBenefits(u)
                            }}
                            placeholder="Title"
                            className="text-sm"
                          />
                          <Input
                            value={b.description}
                            onChange={(e) => {
                              const u = [...sellerBenefits]
                              u[i] = { ...u[i], description: e.target.value }
                              setSellerBenefits(u)
                            }}
                            placeholder="Description"
                            className="text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSellerBenefits((prev) => prev.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSellerBenefits((prev) => [...prev, { title: '', description: '' }])
                        }
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Benefit
                      </Button>

                      <Button
                        onClick={() =>
                          handleSaveSection({
                            ...sellerCtaForm,
                            seller_cta_benefits: sellerBenefits,
                          })
                        }
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Seller CTA
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ── TRUST INDICATORS ── */}
            <TabsContent value="trust">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Trust Indicators
                  </CardTitle>
                  <CardDescription>
                    Trust badges shown below the hero. Add emojis + text.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trustIndicators.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                      <Input
                        value={item.emoji}
                        onChange={(e) => {
                          const u = [...trustIndicators]
                          u[i] = { ...u[i], emoji: e.target.value }
                          setTrustIndicators(u)
                        }}
                        className="w-20 text-center"
                        placeholder="Emoji"
                      />
                      <Input
                        value={item.text}
                        onChange={(e) => {
                          const u = [...trustIndicators]
                          u[i] = { ...u[i], text: e.target.value }
                          setTrustIndicators(u)
                        }}
                        placeholder="Trust badge text"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrustIndicators((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => setTrustIndicators((prev) => [...prev, { emoji: '', text: '' }])}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Indicator
                  </Button>

                  <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Tip:</strong> Use emojis like 🛡️ (shield), ✅ (check), 💳 (card).
                      Copy from your OS emoji picker. These appear in the compact bar below the hero.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleSaveSection({ trust_indicators: trustIndicators })}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Trust Indicators
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── FOOTER: Newsletter + Payment + About ── */}
            <TabsContent value="footer">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Newsletter */}
                <Card>
                  <CardHeader>
                    <CardTitle>Newsletter Section</CardTitle>
                    <CardDescription>Title and subtitle for the footer newsletter.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Newsletter Title</Label>
                      <Input
                        value={newsletterTitle}
                        onChange={(e) => setNewsletterTitle(e.target.value)}
                        placeholder="Stay Updated with DuukaAfrica"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input
                        value={newsletterSubtitle}
                        onChange={(e) => setNewsletterSubtitle(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={() =>
                        handleSaveSection({
                          newsletter_title: newsletterTitle,
                          newsletter_subtitle: newsletterSubtitle,
                        })
                      }
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Newsletter
                    </Button>
                  </CardContent>
                </Card>

                {/* Footer Content */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Footer Settings
                    </CardTitle>
                    <CardDescription>About text, copyright, and payment methods.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>About Text</Label>
                      <textarea
                        value={footerAbout}
                        onChange={(e) => setFooterAbout(e.target.value)}
                        className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm"
                        placeholder="Brief description of your platform..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Copyright Name</Label>
                      <Input
                        value={footerCopyright}
                        onChange={(e) => setFooterCopyright(e.target.value)}
                        placeholder="DuukaAfrica"
                      />
                    </div>

                    <Separator />
                    <p className="text-sm font-medium">Payment Method Badges</p>
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map((m, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {m}
                          <button
                            onClick={() => setPaymentMethods((prev) => prev.filter((_, idx) => idx !== i))}
                            className="ml-1 text-gray-400 hover:text-red-500"
                          >
                            &times;
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newPaymentMethod}
                        onChange={(e) => setNewPaymentMethod(e.target.value)}
                        placeholder="e.g. MTN MoMo"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newPaymentMethod.trim()) {
                            setPaymentMethods((prev) => [...prev, newPaymentMethod.trim()])
                            setNewPaymentMethod('')
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newPaymentMethod.trim()) {
                            setPaymentMethods((prev) => [...prev, newPaymentMethod.trim()])
                            setNewPaymentMethod('')
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      onClick={() =>
                        handleSaveSection({
                          footer_about: footerAbout,
                          footer_copyright: footerCopyright,
                          payment_methods: paymentMethods,
                        })
                      }
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Footer Settings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
