'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cart-store'
import { useCheckoutStore } from '@/store/checkout-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  MapPin, 
  Truck, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Shield,
  Loader2,
  ShoppingBag,
  Package,
  AlertCircle,
  Bus,
  CreditCard,
  Smartphone
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatPrice, COUNTRY_INFO, COUNTRY_CURRENCY, Currency, Country, PHONE_PATTERNS, getRegulatorForCountry } from '@/lib/currency'

// Countries we support — derived from currency.ts (single source of truth)
const countries: Array<{ code: Country; name: string; flag: string; currency: Currency; phoneCode: string }> =
  Object.entries(COUNTRY_INFO).map(([code, info]) => ({
    code: code as Country,
    name: info.name,
    flag: info.flag,
    currency: COUNTRY_CURRENCY[code as Country],
    phoneCode: info.phoneCode,
  }))

interface ShippingResult {
  success: boolean
  canShip: boolean
  shipping?: {
    zoneType: string
    fee: number
    feeFormatted: string
    currency: string
    estimatedDays: string
    minDays: number
    maxDays: number
  }
  error?: string
}

// Payment methods configuration by country
// Pesapal processes all payments — these options are shown for user familiarity
interface PaymentOption {
  id: string
  type: 'CARD' | 'MOBILE_MONEY'
  provider: 'PESAPAL'
  label: string
  icon?: string
  mobileMoneyCode?: string
}

function getPaymentMethodsForCountry(countryCode: string): PaymentOption[] {
  const card: PaymentOption = {
    id: 'card',
    type: 'CARD',
    provider: 'PESAPAL',
    label: 'Visa / Mastercard',
    icon: 'CreditCard',
  }

  const mobileMoneyByCountry: Record<string, PaymentOption[]> = {
    UGANDA: [
      { id: 'mtn_momo_ug', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'MTN Mobile Money', icon: 'Smartphone', mobileMoneyCode: 'MTN_MONEY_UG' },
      { id: 'airtel_money_ug', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'Airtel Money', icon: 'Smartphone', mobileMoneyCode: 'AIRTEL_MONEY_UG' },
    ],
    KENYA: [
      { id: 'mpesa_ke', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'M-Pesa', icon: 'Smartphone', mobileMoneyCode: 'MPESA' },
      { id: 'airtel_money_ke', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'Airtel Money', icon: 'Smartphone', mobileMoneyCode: 'AIRTEL_MONEY_KE' },
    ],
    TANZANIA: [
      { id: 'mpesa_tz', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'M-Pesa', icon: 'Smartphone', mobileMoneyCode: 'MPESA_TZ' },
      { id: 'airtel_money_tz', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'Airtel Money', icon: 'Smartphone', mobileMoneyCode: 'AIRTEL_MONEY_TZ' },
      { id: 'tigo_pesa', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'Tigo Pesa', icon: 'Smartphone', mobileMoneyCode: 'TIGO_PESA' },
    ],
    RWANDA: [
      { id: 'mtn_momo_rw', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'MTN Mobile Money', icon: 'Smartphone', mobileMoneyCode: 'MTN_MONEY_RW' },
      { id: 'airtel_money_rw', type: 'MOBILE_MONEY', provider: 'PESAPAL', label: 'Airtel Money', icon: 'Smartphone', mobileMoneyCode: 'AIRTEL_MONEY_RW' },
    ],
  }

  return [card, ...(mobileMoneyByCountry[countryCode] || [])]
}

export default function CheckoutPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { items, getSubtotal, getTotalSavings, getItemCount } = useCartStore()
  const {
    currentStep,
    steps,
    shippingAddress,
    deliveryOption,
    paymentMethod,
    setStep,
    nextStep,
    prevStep,
    setShippingAddress,
    setDeliveryOption,
    setPaymentMethod,
    setOrderId,
    idempotencyKey,
  } = useCheckoutStore()

  const [isLoading, setIsLoading] = useState(false)
  const [shippingResult, setShippingResult] = useState<ShippingResult | null>(null)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: '',
    country: '',
    region: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    saveAddress: true,
  })
  const [phoneError, setPhoneError] = useState('')

  // Phone validation patterns imported from currency.ts (centralized)

  function validatePhone(phone: string, country: string): string {
    if (!phone.trim()) return 'Phone number is required'
    if (!country) return 'Please select your country first'
    const config = PHONE_PATTERNS[country as Country]
    if (!config) return 'Invalid country'
    const cleaned = phone.replace(/\s/g, '')
    if (!config.pattern.test(cleaned)) return `Enter a valid ${config.label} phone number (e.g. ${config.placeholder})`
    return ''
  }

  // Get buyer's currency based on selected country
  const buyerCurrency = COUNTRY_CURRENCY[formData.country as keyof typeof COUNTRY_CURRENCY] || 'UGX'

  // Calculate shipping when country changes
  useEffect(() => {
    if (items.length > 0 && formData.country) {
      calculateShipping()
    }
  }, [formData.country, items])

  const calculateShipping = async () => {
    setIsCalculatingShipping(true)
    try {
      const firstItem = items[0]
      
      const response = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerCountry: firstItem.sellerCountry || 'UGANDA',
          buyerCountry: formData.country,
          weightKg: items.reduce((sum, item) => sum + (item.weight || 0.5) * item.quantity, 0),
          sellerCurrency: firstItem.currency || 'UGX',
          buyerCurrency
        })
      })

      const result = await response.json()
      setShippingResult(result)
      
      if (result.success && result.canShip && result.shipping) {
        setDeliveryOption({
          id: 'bus',
          name: `Bus Delivery (${result.shipping.zoneType.replace('_', ' ')})`,
          price: result.shipping.fee,
          estimatedDays: result.shipping.estimatedDays,
          zoneType: result.shipping.zoneType
        })
      }
    } catch (error) {
      console.error('Shipping calculation error:', error)
    } finally {
      setIsCalculatingShipping(false)
    }
  }

  const subtotal = getSubtotal()
  const savings = getTotalSavings()
  const itemCount = getItemCount()
  const shipping = deliveryOption?.price || 0
  const total = subtotal + shipping

  // Payment methods available based on buyer's country
  const paymentMethods = getPaymentMethodsForCountry(formData.country)

  // Auto-select first payment method if none selected
  useEffect(() => {
    if (!paymentMethod && paymentMethods.length > 0) {
      setPaymentMethod(paymentMethods[0])
    }
  }, [paymentMethod, paymentMethods, setPaymentMethod])

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-4">Add items to your cart to checkout</p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleAddressSubmit = () => {
    const error = validatePhone(formData.phone, formData.country)
    if (error) { setPhoneError(error); return }
    setShippingAddress(formData)
    nextStep()
  }

  const handlePlaceOrder = async () => {
    if (isLoading) return // Prevent double-click / double-order
    setIsLoading(true)
    try {
      // Step 1: Create order
      const orderResponse = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: formData,
          deliveryOption,
          paymentMethod: paymentMethod || { type: 'CARD', provider: 'PESAPAL', id: 'card', label: 'Visa / Mastercard' },
          subtotal,
          shipping,
          total,
          buyerCountry: formData.country,
          buyerCurrency,
          idempotencyKey,
        }),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create order')
      }

      setOrderId(orderData.order.id)

      // Step 2: Initialize Pesapal payment
      const paymentResponse = await fetch('/api/pesapal/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.order.id,
        })
      })

      const paymentData = await paymentResponse.json()

      if (paymentData.success && (paymentData.redirectUrl || paymentData.paymentLink)) {
        // Step 3: Redirect to Pesapal payment page
        window.location.href = paymentData.redirectUrl || paymentData.paymentLink
      } else {
        throw new Error(paymentData.error || 'Failed to initialize payment')
      }

    } catch (error: any) {
      console.error('Error placing order:', error)
      alert(error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if any items can't be shipped to buyer's country
  const cantShipItems = items.filter(item => {
    if (item.localShippingOnly && item.sellerCountry !== formData.country) {
      return true
    }
    if (item.shipsToCountries && item.shipsToCountries.length > 0) {
      return !item.shipsToCountries.includes(formData.country)
    }
    return false
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
              DuukaAfrica
            </Link>
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Secure Checkout</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step.isCompleted
                      ? 'bg-green-500 text-white'
                      : step.isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden sm:block ${
                    step.isCurrent ? 'text-primary' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-12 sm:w-24 h-1 mx-2 rounded ${
                      step.isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Address */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </CardTitle>
                  <CardDescription>Where should we deliver your order?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setPhoneError('') }}
                        placeholder={PHONE_PATTERNS[formData.country]?.placeholder || '+256 7XX XXX XXX'}
                      />
                      {phoneError && <p className="text-xs text-red-500 mt-1" role="alert">{phoneError}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        Seller will call this number for bus delivery coordination
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <select
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        aria-label="Country"
                        className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="region">Region/State *</Label>
                      <Input
                        id="region"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                        placeholder="Central Region"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Kampala"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={formData.addressLine1}
                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                        placeholder="Street address, P.O. box"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                      <Input
                        id="addressLine2"
                        value={formData.addressLine2}
                        onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                        placeholder="Apartment, suite, building, floor, etc."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="saveAddress"
                      checked={formData.saveAddress}
                      onCheckedChange={(checked) => setFormData({ ...formData, saveAddress: checked as boolean })}
                    />
                    <Label htmlFor="saveAddress" className="text-sm">
                      Save this address for future orders
                    </Label>
                  </div>

                  {/* Cannot ship warning */}
                  {cantShipItems.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Some items cannot be shipped to your country</span>
                      </div>
                      <ul className="mt-2 text-sm text-red-600">
                        {cantShipItems.map(item => (
                          <li key={item.productId}>• {item.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button
                      size="lg"
                      onClick={handleAddressSubmit}
                      disabled={!!phoneError || !formData.fullName || !formData.phone || !formData.city || !formData.addressLine1}
                    >
                      Continue to Delivery
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Delivery Options */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="w-5 h-5" />
                    Delivery Options
                  </CardTitle>
                  <CardDescription>
                    Bus delivery across East Africa
                    {shippingResult?.shipping && (
                      <span className="ml-2 text-sm text-green-600">
                        ({shippingResult.shipping.zoneType.replace('_', ' ')} zone)
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isCalculatingShipping ? (
                    <div className="flex items-center justify-center py-8" role="status">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="ml-2">Calculating shipping...</span>
                    </div>
                  ) : shippingResult?.canShip ? (
                    <div className="space-y-4">
                      <div 
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors border-primary bg-primary/5`}
                      >
                        <div className="flex items-center gap-4">
                          <Bus className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Bus Parcel Delivery</p>
                            <p className="text-sm text-gray-500">
                              {shippingResult.shipping?.estimatedDays}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Seller will call you with bus details (company, number plate, conductor phone)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {shippingResult.shipping?.feeFormatted}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {shippingResult.shipping?.zoneType.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
                      <p className="text-red-600">
                        {shippingResult?.error || 'Cannot calculate shipping to your location'}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      size="lg" 
                      onClick={nextStep} 
                      disabled={!shippingResult?.canShip || !deliveryOption}
                    >
                      Continue to Payment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment Method — Card & Mobile Money by Country */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>Choose how you&apos;d like to pay</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* ---- Card Payment ---- */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Card Payment</h4>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod(paymentMethods.find(m => m.id === 'card')!)}
                        className={`w-full flex items-center justify-between p-4 border-2 rounded-xl transition-all cursor-pointer ${
                          paymentMethod?.id === 'card'
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">Visa / Mastercard</p>
                            <p className="text-sm text-gray-500">Pay with any bank debit or credit card</p>
                          </div>
                        </div>
                        {paymentMethod?.id === 'card' && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* ---- Mobile Money ---- */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Mobile Money{formData.country !== 'UGANDA' && (
                          <span className="ml-1">
                            — <span className="text-xs">{countries.find(c => c.code === formData.country)?.flag} {countries.find(c => c.code === formData.country)?.name}</span>
                          </span>
                        )}
                      </h4>
                      <div className="space-y-3">
                        {paymentMethods.filter(m => m.type === 'MOBILE_MONEY').map((method) => {
                          const isSelected = paymentMethod?.id === method.id
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`w-full flex items-center justify-between p-4 border-2 rounded-xl transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                  method.id.includes('mtn')
                                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                                    : method.id.includes('airtel')
                                      ? 'bg-gradient-to-br from-red-500 to-red-600'
                                      : method.id.includes('mpesa')
                                        ? 'bg-gradient-to-br from-green-500 to-green-600'
                                        : 'bg-gradient-to-br from-cyan-400 to-cyan-500'
                                }`}
                                >
                                  <Smartphone className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                  <p className="font-semibold">{method.label}</p>
                                  <p className="text-sm text-gray-500">Pay directly from your phone</p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Security notice */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                      <Shield className="w-4 h-4 text-green-500 shrink-0" />
                      <span>Payments are processed securely by Pesapal — regulated by {getRegulatorForCountry(formData.country)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      size="lg"
                      onClick={nextStep}
                      disabled={!paymentMethod}
                    >
                      Review Order
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Review Order
                  </CardTitle>
                  <CardDescription>Review your order before placing it</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium mb-2">Shipping Address</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {shippingAddress?.fullName}<br />
                      {shippingAddress?.addressLine1}<br />
                      {shippingAddress?.addressLine2 && <>{shippingAddress.addressLine2}<br /></>}
                      {shippingAddress?.city}, {shippingAddress?.region}<br />
                      {shippingAddress?.phone}
                    </p>
                  </div>

                  <Separator />

                  {/* Delivery */}
                  <div>
                    <h4 className="font-medium mb-2">Delivery Method</h4>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Bus className="w-5 h-5" />
                      <span>{deliveryOption?.name} - {deliveryOption?.estimatedDays}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment */}
                  <div>
                    <h4 className="font-medium mb-2">Payment Method</h4>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      {paymentMethod?.type === 'CARD' ? (
                        <CreditCard className="w-5 h-5" />
                      ) : (
                        <Smartphone className="w-5 h-5" />
                      )}
                      <span>{paymentMethod?.label || 'Pesapal'}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Items */}
                  <div>
                    <h4 className="font-medium mb-2">Order Items ({itemCount})</h4>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.productId} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {item.name} x {item.quantity}
                          </span>
                          <span>{formatPrice(item.price * item.quantity, (item.currency || 'UGX') as Currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button size="lg" onClick={handlePlaceOrder} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Pay {formatPrice(total, buyerCurrency)}
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card className="sticky top-32">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items Preview */}
                <div className="space-y-3">
                  {items.slice(0, 3).map((item) => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(item.price * item.quantity, (item.currency || 'UGX') as Currency)}
                      </p>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{items.length - 3} more items
                    </p>
                  )}
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal, buyerCurrency)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Savings</span>
                      <span>-{formatPrice(savings, buyerCurrency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Shipping</span>
                    <span>{shipping > 0 ? formatPrice(shipping, buyerCurrency) : 'FREE'}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total, buyerCurrency)}</span>
                </div>

                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <Shield className="w-4 h-4" />
                    <span>Secure payment via Pesapal — regulated by {getRegulatorForCountry(formData.country)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
