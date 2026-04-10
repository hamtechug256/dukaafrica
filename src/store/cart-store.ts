'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  quantity: number
  image: string | null
  storeId: string
  storeName: string
  variantId?: string
  variantName?: string
  maxQuantity: number
  // Additional fields for checkout
  sellerCountry?: string
  weight?: number
  currency?: string
  freeShipping?: boolean
  localShippingOnly?: boolean
  shipsToCountries?: string[]
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  isLoading: boolean
  
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  setLoading: (loading: boolean) => void
  
  getItemCount: () => number
  getSubtotal: () => number
  getTotalSavings: () => number
  getItemsByStore: () => Record<string, CartItem[]>
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isLoading: false,

      addItem: (item) => {
        const items = get().items
        
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        )

        if (existingIndex > -1) {
          const newQuantity = Math.min(
            items[existingIndex].quantity + item.quantity,
            item.maxQuantity
          )
          set({
            items: items.map((i, idx) =>
              idx === existingIndex ? { ...i, quantity: newQuantity } : i
            ),
          })
        } else {
          set({
            items: [...items, item],
          })
        }
        
        set({ isOpen: true })
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
          ),
        }))
      },

      updateQuantity: (productId, quantity, variantId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.max(1, Math.min(quantity, item.maxQuantity)) }
              : item
          ),
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
      },

      getTotalSavings: () => {
        return get().items.reduce((total, item) => {
          if (item.comparePrice) {
            return total + (item.comparePrice - item.price) * item.quantity
          }
          return total
        }, 0)
      },

      getItemsByStore: () => {
        const items = get().items
        return items.reduce((acc, item) => {
          if (!acc[item.storeId]) {
            acc[item.storeId] = []
          }
          acc[item.storeId].push(item)
          return acc
        }, {} as Record<string, CartItem[]>)
      },
    }),
    {
      name: 'duukaafrica-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
)
