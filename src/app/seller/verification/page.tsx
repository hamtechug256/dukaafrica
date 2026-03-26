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
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  FileText,
  Camera,
  Building,
  CreditCard,
  Clock,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Tier configuration
const TIERS = {
  STARTER: {
    name: 'Starter Seller',
    description: 'Basic features with buyer protection',
    commission: 15,
    holdDays: 7,
    maxProducts: 10,
    color: 'oklch(0.6 0.1 45)',
    benefits: ['List up to 10 products', 'Standard support', 'Basic analytics'],
    requires: [] as string[],
  },
  VERIFIED: {
    name: 'Verified Seller',
    description: 'ID verified with lower fees and faster payouts',
    commission: 10,
    holdDays: 5,
    maxProducts: 100,
    color: 'oklch(0.55 0.15 140)',
    benefits: ['List up to 100 products', 'Feature products', 'Flash sales', 'Priority support', '5% lower commission'],
    requires: ['ID Document', 'Selfie with ID'],
  },
  PREMIUM: {
    name: 'Premium Seller',
    description: 'Business verified with best rates and unlimited features',
    commission: 8,
    holdDays: 3,
    maxProducts: -1,
    color: 'oklch(0.7 0.15 55)',
    benefits: ['Unlimited products', 'Bulk upload', 'Advanced analytics', 'Fastest payouts', '8% lowest commission'],
    requires: ['ID Document', 'Selfie with ID', 'Business Registration', 'Tax Document'],
  },
}

const ID_TYPES = [
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
]

interface VerificationStatus {
  status: string // UNVERIFIED, PENDING, VERIFIED, REJECTED
  tier: string // STARTER, VERIFIED, PREMIUM
  idType: string | null
  idNumber: string | null
  idDocumentUrl: string | null
  idDocumentBackUrl: string | null
  selfieWithIdUrl: string | null
  businessName: string | null
  businessType: string | null
  businessDocUrl: string | null
  taxId: string | null
  taxDocUrl: string | null
  physicalLocationUrl: string | null
  verifiedAt: string | null
  verificationNotes: string | null
  verificationRejectedReason: string | null
}

export default function SellerVerificationPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verification, setVerification] = useState<VerificationStatus | null>(null)
  const [targetTier, setTargetTier] = useState<string>('VERIFIED')
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  // Form state
  const [formData, setFormData] = useState({
    idType: '',
    idNumber: '',
    businessName: '',
    businessType: '',
    taxId: '',
  })

  // File state
  const [files, setFiles] = useState({
    idDocument: null as File | null,
    idDocumentBack: null as File | null,
    selfieWithId: null as File | null,
    businessDoc: null as File | null,
    taxDoc: null as File | null,
    physicalLocation: null as File | null,
  })

  // Preview URLs
  const [previews, setPreviews] = useState({
    idDocument: '',
    idDocumentBack: '',
    selfieWithId: '',
    businessDoc: '',
    taxDoc: '',
    physicalLocation: '',
  })

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role || user.unsafeMetadata?.role
      if (role !== 'SELLER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        router.push('/dashboard')
      } else {
        fetchVerificationStatus()
      }
    }
  }, [isLoaded, user, router])

  async function fetchVerificationStatus() {
    try {
      const res = await fetch('/api/seller/verification')
      if (res.ok) {
        const data = await res.json()
        setVerification(data.verification)
        setTargetTier(data.verification.tier || 'VERIFIED')
      }
    } catch (error) {
      console.error('Error fetching verification:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleFileChange(field: string, file: File | null) {
    setFiles(prev => ({ ...prev, [field]: file }))
    
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result as string }))
      }
      reader.readAsDataURL(file)
    } else {
      setPreviews(prev => ({ ...prev, [field]: '' }))
    }
  }

  async function uploadFile(file: File, type: string): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        return data.url
      }
      return null
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    
    try {
      // Validate required fields based on tier
      const errors: string[] = []
      
      if (targetTier === 'VERIFIED' || targetTier === 'PREMIUM') {
        if (!formData.idType) errors.push('ID type is required')
        if (!formData.idNumber) errors.push('ID number is required')
        if (!files.idDocument && !verification?.idDocumentUrl) errors.push('ID document is required')
        if (!files.selfieWithId && !verification?.selfieWithIdUrl) errors.push('Selfie with ID is required')
      }
      
      if (targetTier === 'PREMIUM') {
        if (!formData.businessName) errors.push('Business name is required')
        if (!files.businessDoc && !verification?.businessDocUrl) errors.push('Business document is required')
        if (!formData.taxId) errors.push('Tax ID is required')
        if (!files.taxDoc && !verification?.taxDocUrl) errors.push('Tax document is required')
      }
      
      if (errors.length > 0) {
        toast({
          title: 'Validation Error',
          description: errors[0],
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      // Upload files
      const uploadedUrls: Record<string, string | null> = {}
      
      if (files.idDocument) {
        uploadedUrls.idDocumentUrl = await uploadFile(files.idDocument, 'verification')
      }
      if (files.idDocumentBack) {
        uploadedUrls.idDocumentBackUrl = await uploadFile(files.idDocumentBack, 'verification')
      }
      if (files.selfieWithId) {
        uploadedUrls.selfieWithIdUrl = await uploadFile(files.selfieWithId, 'verification')
      }
      if (files.businessDoc) {
        uploadedUrls.businessDocUrl = await uploadFile(files.businessDoc, 'verification')
      }
      if (files.taxDoc) {
        uploadedUrls.taxDocUrl = await uploadFile(files.taxDoc, 'verification')
      }
      if (files.physicalLocation) {
        uploadedUrls.physicalLocationUrl = await uploadFile(files.physicalLocation, 'verification')
      }

      // Submit verification
      const res = await fetch('/api/seller/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTier,
          idType: formData.idType,
          idNumber: formData.idNumber,
          businessName: formData.businessName,
          businessType: formData.businessType,
          taxId: formData.taxId,
          ...uploadedUrls,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Verification Submitted',
          description: 'We will review your documents within 24-48 hours.',
        })
        fetchVerificationStatus()
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit verification',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentTier = TIERS[verification?.tier as keyof typeof TIERS] || TIERS.STARTER
  const selectedTier = TIERS[targetTier as keyof typeof TIERS]

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      {/* Header */}
      <header className="bg-white dark:bg-[oklch(0.15_0.02_45)] border-b border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.25_0.02_45)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/seller/settings" className="text-[oklch(0.45_0.02_45)] hover:text-[oklch(0.15_0.02_45)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[oklch(0.15_0.02_45)] dark:text-white">
                Seller Verification
              </h1>
              <p className="text-sm text-[oklch(0.45_0.02_45)]">
                Verify your identity to unlock more features
              </p>
            </div>
          </div>
          <Badge 
            style={{ background: currentTier.color }}
            className="text-white"
          >
            {currentTier.name}
          </Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Status Banner */}
        {verification?.status === 'PENDING' && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4 flex items-center gap-4">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Verification In Progress
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your documents are being reviewed. This typically takes 24-48 hours.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {verification?.status === 'REJECTED' && (
          <Card className="mb-8 border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-200">
                    Verification Not Approved
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {verification.verificationRejectedReason || 'Please review and resubmit your documents.'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setVerification({ ...verification, status: 'UNVERIFIED' })}
                  >
                    Resubmit Documents
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {verification?.status === 'VERIFIED' && (
          <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="flex-1">
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  Verified Seller
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your account is verified. Enjoy lower fees and faster payouts!
                </p>
              </div>
              {verification.tier !== 'PREMIUM' && (
                <Button 
                  onClick={() => setTargetTier('PREMIUM')}
                  className="bg-[oklch(0.7_0.15_55)] hover:bg-[oklch(0.65_0.14_55)] text-white"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tier Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choose Your Tier</CardTitle>
                <CardDescription>
                  Higher tiers unlock more features and better rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(TIERS).map(([key, tier]) => (
                  <div
                    key={key}
                    onClick={() => verification?.status !== 'PENDING' && setTargetTier(key)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      targetTier === key 
                        ? 'border-current' 
                        : 'border-transparent hover:border-[oklch(0.9_0.02_85)]'
                    } ${verification?.status === 'PENDING' ? 'opacity-50 pointer-events-none' : ''}`}
                    style={{ borderColor: targetTier === key ? tier.color : undefined }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{tier.name}</span>
                      <Badge 
                        variant="outline"
                        style={{ borderColor: tier.color, color: tier.color }}
                      >
                        {tier.commission}% fee
                      </Badge>
                    </div>
                    <p className="text-sm text-[oklch(0.45_0.02_45)] mb-3">
                      {tier.description}
                    </p>
                    <div className="space-y-1">
                      {tier.benefits.slice(0, 3).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                    {tier.requires.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[oklch(0.9_0.02_85)]">
                        <p className="text-xs text-[oklch(0.55_0.02_45)]">Requires:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tier.requires.map((req, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Verification Form */}
          <div className="lg:col-span-2 space-y-6">
            {verification?.status !== 'PENDING' && verification?.status !== 'VERIFIED' && (
              <>
                {/* ID Verification */}
                {(targetTier === 'VERIFIED' || targetTier === 'PREMIUM') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        ID Verification
                      </CardTitle>
                      <CardDescription>
                        Upload a clear photo of your government-issued ID
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ID Type</Label>
                          <Select
                            value={formData.idType}
                            onValueChange={(value) => setFormData({ ...formData, idType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select ID type" />
                            </SelectTrigger>
                            <SelectContent>
                              {ID_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>ID Number</Label>
                          <Input
                            placeholder="Enter ID number"
                            value={formData.idNumber}
                            onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* ID Front */}
                        <div className="space-y-3">
                          <Label>ID Document (Front)</Label>
                          <div className="border-2 border-dashed border-[oklch(0.9_0.02_85)] rounded-lg p-4 text-center">
                            {previews.idDocument || verification?.idDocumentUrl ? (
                              <div className="relative">
                                <img
                                  src={previews.idDocument || verification?.idDocumentUrl || ''}
                                  alt="ID Document"
                                  className="max-h-40 mx-auto rounded"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-0 right-0"
                                  onClick={() => handleFileChange('idDocument', null)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <Upload className="w-8 h-8 mx-auto text-[oklch(0.55_0.02_45)] mb-2" />
                                <p className="text-sm text-[oklch(0.45_0.02_45)]">Click to upload</p>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('idDocument', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Selfie with ID */}
                        <div className="space-y-3">
                          <Label>Selfie Holding ID</Label>
                          <div className="border-2 border-dashed border-[oklch(0.9_0.02_85)] rounded-lg p-4 text-center">
                            {previews.selfieWithId || verification?.selfieWithIdUrl ? (
                              <div className="relative">
                                <img
                                  src={previews.selfieWithId || verification?.selfieWithIdUrl || ''}
                                  alt="Selfie"
                                  className="max-h-40 mx-auto rounded"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-0 right-0"
                                  onClick={() => handleFileChange('selfieWithId', null)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <Camera className="w-8 h-8 mx-auto text-[oklch(0.55_0.02_45)] mb-2" />
                                <p className="text-sm text-[oklch(0.45_0.02_45)]">Take a selfie with your ID</p>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('selfieWithId', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Business Verification */}
                {targetTier === 'PREMIUM' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Business Verification
                      </CardTitle>
                      <CardDescription>
                        Required for Premium sellers to access all features
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Business Name</Label>
                          <Input
                            placeholder="Your registered business name"
                            value={formData.businessName}
                            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tax ID / TIN</Label>
                          <Input
                            placeholder="Tax Identification Number"
                            value={formData.taxId}
                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Business Document */}
                        <div className="space-y-3">
                          <Label>Business Registration</Label>
                          <div className="border-2 border-dashed border-[oklch(0.9_0.02_85)] rounded-lg p-4 text-center">
                            {previews.businessDoc || verification?.businessDocUrl ? (
                              <div className="relative">
                                <img
                                  src={previews.businessDoc || verification?.businessDocUrl || ''}
                                  alt="Business Document"
                                  className="max-h-40 mx-auto rounded"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-0 right-0"
                                  onClick={() => handleFileChange('businessDoc', null)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <FileText className="w-8 h-8 mx-auto text-[oklch(0.55_0.02_45)] mb-2" />
                                <p className="text-sm text-[oklch(0.45_0.02_45)]">Upload business registration</p>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('businessDoc', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Tax Document */}
                        <div className="space-y-3">
                          <Label>Tax Registration Document</Label>
                          <div className="border-2 border-dashed border-[oklch(0.9_0.02_85)] rounded-lg p-4 text-center">
                            {previews.taxDoc || verification?.taxDocUrl ? (
                              <div className="relative">
                                <img
                                  src={previews.taxDoc || verification?.taxDocUrl || ''}
                                  alt="Tax Document"
                                  className="max-h-40 mx-auto rounded"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-0 right-0"
                                  onClick={() => handleFileChange('taxDoc', null)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <FileText className="w-8 h-8 mx-auto text-[oklch(0.55_0.02_45)] mb-2" />
                                <p className="text-sm text-[oklch(0.45_0.02_45)]">Upload tax document</p>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('taxDoc', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                  <Button variant="outline" asChild>
                    <Link href="/seller/settings">Cancel</Link>
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-[oklch(0.55_0.15_140)] text-white hover:bg-[oklch(0.5_0.14_140)]"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Shield className="w-4 h-4 mr-2" />
                    Submit for Verification
                  </Button>
                </div>
              </>
            )}

            {/* Info for verified/pending users */}
            {(verification?.status === 'PENDING' || verification?.status === 'VERIFIED') && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Verification Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[oklch(0.45_0.02_45)]">Commission Rate</span>
                        <span className="font-bold" style={{ color: currentTier.color }}>
                          {currentTier.commission}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[oklch(0.45_0.02_45)]">Escrow Hold Period</span>
                        <span className="font-medium">{currentTier.holdDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[oklch(0.45_0.02_45)]">Product Limit</span>
                        <span className="font-medium">
                          {currentTier.maxProducts === -1 ? 'Unlimited' : currentTier.maxProducts}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Your Benefits</h4>
                      <div className="space-y-2">
                        {currentTier.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
