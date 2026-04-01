import { create } from 'zustand'

export interface CheckoutStep {
  id: string
  name: string
  isCompleted: boolean
  isCurrent: boolean
}

interface Address {
  fullName: string
  phone: string
  country: string
  region: string
  city: string
  addressLine1: string
  addressLine2?: string
  postalCode?: string
}

interface PaymentMethod {
  id?: string
  type: 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER'
  provider?: string
  phoneNumber?: string
  cardLast4?: string
  cardBrand?: string
}

interface DeliveryOption {
  id: string
  name: string
  description?: string
  price: number
  estimatedDays: string
  zoneType?: string
}

interface CheckoutStore {
  currentStep: number
  steps: CheckoutStep[]
  shippingAddress: Address | null
  billingAddress: Address | null
  useSameAddress: boolean
  deliveryOption: DeliveryOption | null
  paymentMethod: PaymentMethod | null
  couponCode: string | null
  discount: number
  notes: string
  orderId: string | null
  
  // Actions
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setShippingAddress: (address: Address) => void
  setBillingAddress: (address: Address) => void
  setUseSameAddress: (value: boolean) => void
  setDeliveryOption: (option: DeliveryOption) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setCouponCode: (code: string | null) => void
  setDiscount: (amount: number) => void
  setNotes: (notes: string) => void
  setOrderId: (id: string) => void
  reset: () => void
  
  // Computed
  isStepValid: (step: number) => boolean
}

const initialSteps: CheckoutStep[] = [
  { id: 'address', name: 'Shipping', isCompleted: false, isCurrent: true },
  { id: 'delivery', name: 'Delivery', isCompleted: false, isCurrent: false },
  { id: 'payment', name: 'Payment', isCompleted: false, isCurrent: false },
  { id: 'review', name: 'Review', isCompleted: false, isCurrent: false },
]

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  currentStep: 0,
  steps: initialSteps,
  shippingAddress: null,
  billingAddress: null,
  useSameAddress: true,
  deliveryOption: null,
  paymentMethod: null,
  couponCode: null,
  discount: 0,
  notes: '',
  orderId: null,

  setStep: (step) => {
    set((state) => ({
      currentStep: step,
      steps: state.steps.map((s, idx) => ({
        ...s,
        isCurrent: idx === step,
        isCompleted: idx < step,
      })),
    }))
  },

  nextStep: () => {
    const { currentStep, steps } = get()
    if (currentStep < steps.length - 1) {
      set((state) => ({
        currentStep: currentStep + 1,
        steps: state.steps.map((s, idx) => ({
          ...s,
          isCurrent: idx === currentStep + 1,
          isCompleted: idx <= currentStep,
        })),
      }))
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set((state) => ({
        currentStep: currentStep - 1,
        steps: state.steps.map((s, idx) => ({
          ...s,
          isCurrent: idx === currentStep - 1,
          isCompleted: idx < currentStep - 1,
        })),
      }))
    }
  },

  setShippingAddress: (address) => {
    set({ shippingAddress: address })
  },

  setBillingAddress: (address) => {
    set({ billingAddress: address })
  },

  setUseSameAddress: (value) => {
    set({ useSameAddress: value })
  },

  setDeliveryOption: (option) => {
    set({ deliveryOption: option })
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method })
  },

  setCouponCode: (code) => {
    set({ couponCode: code })
  },

  setDiscount: (amount) => {
    if (amount >= 0) {
      set({ discount: amount })
    }
  },

  setNotes: (notes) => {
    set({ notes })
  },

  setOrderId: (id) => {
    set({ orderId: id })
  },

  reset: () => {
    set({
      currentStep: 0,
      steps: initialSteps,
      shippingAddress: null,
      billingAddress: null,
      useSameAddress: true,
      deliveryOption: null,
      paymentMethod: null,
      couponCode: null,
      discount: 0,
      notes: '',
      orderId: null,
    })
  },

  isStepValid: (step) => {
    const state = get()
    switch (step) {
      case 0:
        return state.shippingAddress !== null
      case 1:
        return state.deliveryOption !== null
      case 2:
        return state.paymentMethod !== null
      case 3:
        return true
      default:
        return false
    }
  },
}))
