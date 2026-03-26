'use client'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Store, Mail, Phone, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function SellerRegisterPage() {
  const { redirectToSignUp } = useClerk()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    storeName: '',
    storeSlug: '',
    country: '',
    city: '',
    businessType: '',
    agreedToTerms: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Auto-generate slug from store name
    if (name === 'storeName') {
      const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      setFormData(prev => ({ ...prev, storeSlug: slug }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    try {
      // Store form data in session storage for retrieval after sign-up
      sessionStorage.setItem('sellerOnboarding', JSON.stringify({
        storeName: formData.storeName,
        storeSlug: formData.storeSlug,
        country: formData.country,
        city: formData.city,
        businessType: formData.businessType,
        phone: formData.phone,
      }))
      
      // Redirect to Clerk sign-up with custom metadata
      redirectToSignUp({
        signInForceRedirectUrl: '/seller/onboarding',
        signUpForceRedirectUrl: '/seller/onboarding',
      })
    } catch (error: any) {
      console.error('Registration error:', error)
      alert(error?.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const countries = [
    { value: 'UGANDA', label: 'Uganda' },
    { value: 'KENYA', label: 'Kenya' },
    { value: 'TANZANIA', label: 'Tanzania' },
    { value: 'RWANDA', label: 'Rwanda' },
  ]

  const businessTypes = [
    { value: 'individual', label: 'Individual / Sole Proprietor' },
    { value: 'registered', label: 'Registered Business' },
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'distributor', label: 'Distributor / Wholesaler' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Become a Seller</h1>
          <p className="text-gray-600 mt-2">Join DuukaAfrica and start selling today</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{step === 1 ? 'Account Details' : step === 2 ? 'Store Information' : 'Review & Submit'}</CardTitle>
            <CardDescription>
              {step === 1 ? 'Create your seller account' : step === 2 ? 'Tell us about your store' : 'Almost done!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+256 700 123 456"
                        className="pl-10"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <Label htmlFor="storeName">Store Name</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="storeName"
                        name="storeName"
                        placeholder="My Awesome Store"
                        className="pl-10"
                        value={formData.storeName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="storeSlug">Store URL</Label>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">duukaafrica.com/stores/</span>
                      <Input
                        id="storeSlug"
                        name="storeSlug"
                        placeholder="my-awesome-store"
                        value={formData.storeSlug}
                        onChange={handleInputChange}
                        className="flex-1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Country</Label>
                      <Select value={formData.country} onValueChange={(v) => setFormData(prev => ({ ...prev, country: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        placeholder="Kampala"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Business Type</Label>
                    <Select value={formData.businessType} onValueChange={(v) => setFormData(prev => ({ ...prev, businessType: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((b) => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Account Details</h4>
                      <p className="text-sm text-gray-600">
                        {formData.firstName} {formData.lastName}<br />
                        {formData.email}<br />
                        {formData.phone}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Store Details</h4>
                      <p className="text-sm text-gray-600">
                        {formData.storeName}<br />
                        duukaafrica.com/stores/{formData.storeSlug}<br />
                        {formData.city}, {formData.country}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreedToTerms}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreedToTerms: checked as boolean }))}
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                      I agree to the{' '}
                      <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </label>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                ) : (
                  <Link href="/seller">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                )}
                
                {step < 3 ? (
                  <Button type="button" onClick={() => setStep(step + 1)}>
                    Continue
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={!formData.agreedToTerms || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
