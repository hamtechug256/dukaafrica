'use client'

// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Store, 
  MapPin, 
  FileText, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload
} from 'lucide-react'

const steps = [
  { id: 1, title: 'Store Information', icon: Store },
  { id: 2, title: 'Location & Contact', icon: MapPin },
  { id: 3, title: 'Business Details', icon: FileText },
  { id: 4, title: 'Verification', icon: CheckCircle },
]

const countries = [
  { code: 'UG', name: 'Uganda', currency: 'UGX', flag: '🇺🇬' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', flag: '🇷🇼' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP', flag: '🇸🇸' },
  { code: 'BI', name: 'Burundi', currency: 'BIF', flag: '🇧🇮' },
]

const businessTypes = [
  'Individual / Sole Proprietor',
  'Registered Business',
  'Company Limited',
  'Partnership',
  'Other'
]

export default function SellerOnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    storeCategory: '',
    country: 'UG',
    region: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    businessName: '',
    businessType: '',
    taxId: '',
    acceptTerms: false,
    acceptPolicy: false,
  })

  const progress = (currentStep / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!formData.acceptTerms || !formData.acceptPolicy) {
      alert('Please accept the terms and policies to continue')
      return
    }

    setIsLoading(true)

    try {
      // Create store in database
      const response = await fetch('/api/seller/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Update user metadata
        await user?.update({
          unsafeMetadata: {
            role: 'SELLER',
            onboardingCompleted: true,
            hasStore: true
          }
        })
        
        router.push('/seller/dashboard')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create store')
      }
    } catch (error) {
      console.error('Error creating store:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Set Up Your Store
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your seller profile to start selling on DuukaAfrica
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isComplete = currentStep > step.id
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isActive ? 'text-primary' : isComplete ? 'text-green-500' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : isComplete 
                        ? 'bg-green-100 text-green-500' 
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Step {currentStep} of {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Store Information */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name *</Label>
                  <Input
                    id="storeName"
                    placeholder="e.g., TechHub Uganda"
                    value={formData.storeName}
                    onChange={(e) => updateFormData('storeName', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">This will be your store's display name</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeDescription">Store Description</Label>
                  <Textarea
                    id="storeDescription"
                    placeholder="Tell buyers about your store..."
                    rows={4}
                    value={formData.storeDescription}
                    onChange={(e) => updateFormData('storeDescription', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeCategory">Main Category</Label>
                  <Select 
                    value={formData.storeCategory} 
                    onValueChange={(value) => updateFormData('storeCategory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="fashion">Fashion & Beauty</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="groceries">Groceries</SelectItem>
                      <SelectItem value="sports">Sports & Outdoors</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 2: Location & Contact */}
            {currentStep === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={(value) => updateFormData('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region/State</Label>
                    <Input
                      id="region"
                      placeholder="e.g., Central Region"
                      value={formData.region}
                      onChange={(e) => updateFormData('region', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Kampala"
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Street address"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+256 7XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="store@example.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Business Details */}
            {currentStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Registered Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="If different from store name"
                    value={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select 
                    value={formData.businessType} 
                    onValueChange={(value) => updateFormData('businessType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / TIN (Optional)</Label>
                  <Input
                    id="taxId"
                    placeholder="Your tax identification number"
                    value={formData.taxId}
                    onChange={(e) => updateFormData('taxId', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Required for businesses in some countries. This helps with tax compliance.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    📋 You may be asked to provide verification documents later:
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Government-issued ID</li>
                    <li>• Business registration certificate (if applicable)</li>
                    <li>• Proof of address</li>
                  </ul>
                </div>
              </>
            )}

            {/* Step 4: Verification & Terms */}
            {currentStep === 4 && (
              <>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-6 text-center mb-6">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Almost Done!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Review and accept our terms to complete your store setup.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) => updateFormData('acceptTerms', checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      I accept the{' '}
                      <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                      {' '}and agree to follow DuukaAfrica's seller guidelines.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="policy"
                      checked={formData.acceptPolicy}
                      onCheckedChange={(checked) => updateFormData('acceptPolicy', checked as boolean)}
                    />
                    <Label htmlFor="policy" className="text-sm leading-relaxed cursor-pointer">
                      I accept the{' '}
                      <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                      {' '}and understand how my data will be used.
                    </Label>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Store Summary:</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Store Name:</strong> {formData.storeName || 'Not provided'}</p>
                    <p><strong>Location:</strong> {formData.city}, {countries.find(c => c.code === formData.country)?.name}</p>
                    <p><strong>Phone:</strong> {formData.phone || 'Not provided'}</p>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {currentStep < steps.length ? (
                <Button onClick={handleNext}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.acceptTerms || !formData.acceptPolicy}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Store...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
