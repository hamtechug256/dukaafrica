import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface WishlistItem {
  productId: string
  name: string
  price: number
  currency: string
  image: string
  storeName: string
  addedAt: string
}

interface WishlistStore {
  items: WishlistItem[]
  
  // Actions
  addItem: (item: Omit<WishlistItem, 'addedAt'>) => void
  removeItem: (productId: string) => void
  clearWishlist: () => void
  isInWishlist: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        set((state) => {
          // Check if already in wishlist
          if (state.items.some((i) => i.productId === item.productId)) {
            return state
          }
          return {
            items: [...state.items, { ...item, addedAt: new Date().toISOString() }],
          }
        })
      },
      
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }))
      },
      
      clearWishlist: () => {
        set({ items: [] })
      },
      
      isInWishlist: (productId) => {
        return get().items.some((item) => item.productId === productId)
      },
    }),
    {
      name: 'dukaafrica-wishlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
