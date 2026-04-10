'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  id: string
  type: 'CARD' | 'MOBILE_MONEY'
  provider: 'PESAPAL'
  label: string         // Human-readable name e.g. "Visa / Mastercard", "MTN Mobile Money"
  mobileMoneyCode?: string // e.g. 'MTN_MONEY_UG' — for internal tracking
  icon?: string         // Lucide icon name for display
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
  idempotencyKey: string
  
  // Actions
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setShippingAddress: (address: Address) => void
  setBillingAddress: (address: Address) => void
  setUseSameAddress: (value: boolean) => void
  setDeliveryOption: (option: DeliveryOption | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setCouponCode: (code: string | null) => void
  setDiscount: (amount: number) => void
  setNotes: (notes: string) => void
  setOrderId: (id: string) => void
  regenerateIdempotencyKey: () => void
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

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set, get) => ({
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
      idempotencyKey: typeof crypto !== 'undefined' ? crypto.randomUUID() : '',

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

      regenerateIdempotencyKey: () => {
        set({ idempotencyKey: crypto.randomUUID() })
      },

      reset: () => {
        set({
          currentStep: 0,
          steps: initialSteps,
          paymentMethod: null,
          couponCode: null,
          discount: 0,
          orderId: null,
          idempotencyKey: crypto.randomUUID(),
          // NOTE: shippingAddress, billingAddress, deliveryOption, and notes
          // are intentionally NOT reset here so returning users don't have
          // to re-enter them. Call clearAll() for a full reset.
        })
      },

      clearAll: () => {
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
          idempotencyKey: crypto.randomUUID(),
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
    }),
    {
      name: 'dukaafrica-checkout',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return localStorage
      }),
      // Persist address, delivery, and notes — NOT payment method, coupon, or orderId
      partialize: (state) => ({
        shippingAddress: state.shippingAddress,
        billingAddress: state.billingAddress,
        useSameAddress: state.useSameAddress,
        deliveryOption: state.deliveryOption,
        notes: state.notes,
      }),
    }
  )
)
