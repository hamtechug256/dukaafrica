import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number
  image: string
  currency: string
  storeName: string
  storeSlug: string
  viewedAt: string
}

interface RecentlyViewedState {
  products: RecentProduct[]
  addProduct: (product: RecentProduct) => void
  removeProduct: (productId: string) => void
  clearHistory: () => void
  getRecentProducts: (limit?: number) => RecentProduct[]
}

const MAX_PRODUCTS = 20

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      products: [],

      addProduct: (product) => {
        set((state) => {
          // Remove existing product if already in history
          const filtered = state.products.filter((p) => p.id !== product.id)

          // Add to beginning of array
          const updated = [
            { ...product, viewedAt: new Date().toISOString() },
            ...filtered,
          ].slice(0, MAX_PRODUCTS)

          return { products: updated }
        })
      },

      removeProduct: (productId) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        }))
      },

      clearHistory: () => {
        set({ products: [] })
      },

      getRecentProducts: (limit = 10) => {
        return get().products.slice(0, limit)
      },
    }),
    {
      name: 'dukaafrica-recently-viewed',
    }
  )
)
