'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  Store, 
  Shield, 
  CheckCircle,
  Loader2,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Countries we support (East Africa only)
const countries = [
  {
    id: 'UGANDA',
    name: 'Uganda',
    flag: '🇺🇬',
    currency: 'UGX',
    currencyName: 'Ugandan Shilling',
    phoneCode: '+256',
    mobileMoney: ['MTN Mobile Money', 'Airtel Money']
  },
  {
    id: 'KENYA',
    name: 'Kenya',
    flag: '🇰🇪',
    currency: 'KES',
    currencyName: 'Kenyan Shilling',
    phoneCode: '+254',
    mobileMoney: ['M-Pesa', 'Airtel Money']
  },
  {
    id: 'TANZANIA',
    name: 'Tanzania',
    flag: '🇹🇿',
    currency: 'TZS',
    currencyName: 'Tanzanian Shilling',
    phoneCode: '+255',
    mobileMoney: ['M-Pesa', 'Airtel Money', 'Tigo Pesa']
  },
  {
    id: 'RWANDA',
    name: 'Rwanda',
    flag: '🇷🇼',
    currency: 'RWF',
    currencyName: 'Rwandan Franc',
    phoneCode: '+250',
    mobileMoney: ['MTN Mobile Money', 'Airtel Money']
  }
]

const roles = [
  {
    id: 'BUYER',
    title: 'I want to Buy',
    description: 'Shop from thousands of sellers across East Africa. Find the best deals on products you love.',
    icon: ShoppingCart,
    features: [
      'Browse products from multiple sellers',
      'Pay in your local currency',
      'Bus delivery across East Africa',
      'Secure mobile money payments'
    ],
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  {
    id: 'SELLER',
    title: 'I want to Sell',
    description: 'Start your online business and reach millions of customers across East Africa.',
    icon: Store,
    features: [
      'Create your own online store',
      'Set prices in your local currency',
      'Sell across East Africa',
      'Direct payment to your account'
    ],
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    badge: 'Popular'
  }
]

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [step, setStep] = useState<'country' | 'role'>('country')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleCountrySelect = (countryId: string) => {
    setSelectedCountry(countryId)
  }

  const handleContinueToRole = () => {
    if (selectedCountry) {
      setStep('role')
    }
  }

  const handleRoleSelect = async (role: string) => {
    setSelectedRole(role)
    setIsLoading(true)

    try {
      const country = countries.find(c => c.id === selectedCountry)
      
      // Update user metadata in Clerk
      await user?.update({
        unsafeMetadata: {
          role,
          country: selectedCountry,
          currency: country?.currency,
          onboardingCompleted: false,
          onboardingStep: role === 'SELLER' ? 'store_setup' : 'complete'
        }
      })

      // Sync with our database via API
      await fetch('/api/user/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role,
          country: selectedCountry,
          currency: country?.currency
        })
      })

      // Redirect based on role
      if (role === 'SELLER') {
        router.push('/seller/onboarding')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep('country')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            step === 'country' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            <MapPin className="w-4 h-4" />
            <span>1. Select Country</span>
          </div>
          <div className="w-8 h-0.5 bg-muted" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            step === 'role' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            <Store className="w-4 h-4" />
            <span>2. Choose Role</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {step === 'country' ? 'Welcome to DuukaAfrica! 🎉' : 'How will you use DuukaAfrica?'}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {step === 'country' 
              ? 'Select your country to see prices in your local currency and available products.'
              : 'Tell us how you want to use DuukaAfrica and we\'ll personalize your experience.'
            }
          </p>
        </div>

        {/* Country Selection */}
        {step === 'country' && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {countries.map((country) => {
                const isSelected = selectedCountry === country.id
                
                return (
                  <Card 
                    key={country.id}
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-lg",
                      isSelected 
                        ? "ring-2 ring-primary border-primary" 
                        : "hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                    onClick={() => handleCountrySelect(country.id)}
                  >
                    <CardContent className="pt-6 text-center">
                      <span className="text-5xl mb-4 block">{country.flag}</span>
                      <h3 className="font-semibold text-lg mb-1">{country.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {country.currency} • {country.currencyName}
                      </p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {country.mobileMoney.slice(0, 2).map((mm, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {mm}
                          </Badge>
                        ))}
                      </div>
                      {isSelected && (
                        <div className="mt-4 flex items-center justify-center text-primary">
                          <CheckCircle className="w-5 h-5 mr-1" />
                          <span className="text-sm font-medium">Selected</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleContinueToRole}
                disabled={!selectedCountry}
                className="min-w-[200px]"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {/* Role Selection */}
        {step === 'role' && (
          <>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              ← Back to country selection
            </button>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {roles.map((role) => {
                const Icon = role.icon
                const isSelected = selectedRole === role.id
                
                return (
                  <Card 
                    key={role.id}
                    className={cn(
                      "relative cursor-pointer transition-all duration-300 hover:shadow-xl",
                      isSelected 
                        ? `${role.borderColor} border-2 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900` 
                        : 'border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700',
                      isLoading ? 'pointer-events-none opacity-50' : ''
                    )}
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    {role.badge && (
                      <Badge className={`absolute -top-3 right-4 bg-gradient-to-r ${role.color} text-white`}>
                        {role.badge}
                      </Badge>
                    )}
                    
                    <CardHeader className={role.bgColor}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${role.color}`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{role.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {role.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-6">
                      <ul className="space-y-3">
                        {role.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    {isSelected && isLoading && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {/* Trust Section */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-4">
            <Shield className="w-5 h-5" />
            <span>Your data is secure with us</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can always change your country and role later in your account settings.
          </p>
        </div>
      </div>
    </div>
  )
}
