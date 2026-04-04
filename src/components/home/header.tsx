'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SignInButton, UserButton, useAuth, useClerk } from '@clerk/nextjs'
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  MapPin,
  Sun,
  Moon,
  Sparkles,
  Package,
  Store,
  Settings,
  LayoutDashboard,
  Shield,
  LogOut,
  LogIn,
  Loader2
} from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import Image from 'next/image'

const categories = [
  { name: 'Electronics', icon: '📱', href: '/categories/electronics' },
  { name: 'Fashion', icon: '👗', href: '/categories/fashion' },
  { name: 'Home & Garden', icon: '🏠', href: '/categories/home-garden' },
  { name: 'Beauty', icon: '💄', href: '/categories/beauty' },
  { name: 'Sports', icon: '⚽', href: '/categories/sports' },
  { name: 'Groceries', icon: '🛒', href: '/categories/groceries' },
  { name: 'Baby & Kids', icon: '👶', href: '/categories/baby-kids' },
  { name: 'Books', icon: '📚', href: '/categories/books' },
]

const countries = [
  { name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  { name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
]

// Search result types
interface SearchResult {
  products: Array<{
    id: string
    name: string
    slug: string
    price: number
    currency: string
    image: string | null
    storeName: string
  }>
  categories: Array<{
    id: string
    name: string
    slug: string
    icon: string | null
  }>
  stores: Array<{
    id: string
    name: string
    slug: string
    logo: string | null
  }>
  suggestions: string[]
}

interface UserRole {
  role: string
  isAdmin: boolean
  isSeller: boolean
  isSuperAdmin: boolean
}

export function Header() {
  const { isSignedIn, isLoaded } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()
  const { getItemCount, openCart } = useCartStore()
  const cartCount = getItemCount()
  
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults(null)
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearchResults(false)
    }
  }

  // Fetch user role when signed in
  useEffect(() => {
    async function fetchUserRole() {
      if (isSignedIn) {
        try {
          setRoleLoading(true)
          const res = await fetch('/api/user/role')
          if (res.ok) {
            const data = await res.json()
            if (data.user) {
              setUserRole({
                role: data.user.role,
                isAdmin: data.user.isAdmin,
                isSeller: data.user.isSeller,
                isSuperAdmin: data.user.isSuperAdmin,
              })
            }
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error)
        } finally {
          setRoleLoading(false)
        }
      } else {
        setUserRole(null)
        setRoleLoading(false)
      }
    }

    if (isLoaded) {
      fetchUserRole()
    }
  }, [isSignedIn, isLoaded])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Navigation items based on role
  const getUserNavItems = () => {
    const baseItems = [
      { label: 'My Dashboard', href: '/dashboard', icon: User },
      { label: 'My Orders', href: '/dashboard/orders', icon: Package },
      { label: 'Wishlist', href: '/dashboard/wishlist', icon: Heart },
      { label: 'Settings', href: '/dashboard/addresses', icon: Settings },
    ]

    const sellerItems = [
      { label: 'Seller Dashboard', href: '/seller/dashboard', icon: Store },
    ]

    const adminItems = [
      { label: 'Admin Panel', href: '/admin', icon: Shield },
    ]

    let items = [...baseItems]
    
    // Add seller dashboard for sellers
    if (userRole?.isSeller) {
      items = [...items.slice(0, 1), ...sellerItems, ...items.slice(1)]
    }
    
    // Add admin panel for admins
    if (userRole?.isAdmin) {
      items = [...items.slice(0, 2), ...adminItems, ...items.slice(2)]
    }

    return items
  }

  return (
    <>
      {/* Top Banner */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(90deg, oklch(0.6 0.2 35), oklch(0.55 0.15 140), oklch(0.75 0.14 80))' }}
      >
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-center gap-3 text-white text-sm font-medium">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">Free Delivery in Kampala on orders above UGX 500,000</span>
            <span className="sm:hidden">Free Delivery over UGX 500K</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">0% Seller Fees for Founding Members</span>
          </div>
        </div>
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      </motion.div>

      {/* Main Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 dark:bg-[oklch(0.12_0.02_45)]/95 backdrop-blur-lg shadow-lg'
            : 'bg-white dark:bg-[oklch(0.12_0.02_45)]'
        }`}
      >
        <div className="container mx-auto px-4">
          {/* Main Row */}
          <div className="flex items-center gap-4 lg:gap-6 py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <motion.div
                whileHover={{ rotate: 10 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
              >
                <span className="text-white font-bold text-xl">D</span>
              </motion.div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl text-[oklch(0.15_0.02_45)] dark:text-white">Duuka</span>
                <span className="font-bold text-xl text-[oklch(0.55_0.15_140)]">Africa</span>
              </div>
            </Link>

            {/* Location Selector */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.18_0.02_45)] border border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.28_0.02_45)] cursor-pointer hover:border-[oklch(0.6_0.2_35)] transition-colors">
              <MapPin className="w-4 h-4 text-[oklch(0.55_0.15_140)]" />
              <span className="text-sm font-medium text-[oklch(0.25_0.02_45)] dark:text-white">{selectedCountry.flag}</span>
              <ChevronDown className="w-4 h-4 text-[oklch(0.45_0.02_45)]" />
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <motion.div
                  animate={{ scale: isSearchFocused ? 1.02 : 1 }}
                  className={`relative rounded-2xl transition-all duration-300 ${
                    isSearchFocused
                      ? 'shadow-lg ring-2 ring-[oklch(0.6_0.2_35)]/30'
                      : 'shadow-sm'
                  }`}
                >
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Search for products, brands, categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      setIsSearchFocused(true)
                      if (searchQuery.trim().length >= 2 && searchResults) {
                        setShowSearchResults(true)
                      }
                    }}
                    className="w-full h-12 pl-12 pr-14 rounded-2xl border border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.28_0.02_45)] bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.18_0.02_45)] text-[oklch(0.15_0.02_45)] dark:text-white placeholder:text-[oklch(0.55_0.02_45)] focus:outline-none focus:border-[oklch(0.6_0.2_35)] transition-colors"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.55_0.02_45)]" />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {showSearchResults && searchResults && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[oklch(0.15_0.02_45)] rounded-2xl shadow-2xl border border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.25_0.02_45)] max-h-[70vh] overflow-y-auto z-50"
                      >
                        {/* Products */}
                        {searchResults.products.length > 0 && (
                          <div className="p-4">
                            <h3 className="text-xs font-semibold text-[oklch(0.55_0.02_45)] uppercase tracking-wider mb-3">Products</h3>
                            <div className="space-y-2">
                              {searchResults.products.slice(0, 4).map((product) => (
                                <Link
                                  key={product.id}
                                  href={`/products/${product.slug}`}
                                  onClick={() => {
                                    setShowSearchResults(false)
                                    setSearchQuery('')
                                  }}
                                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
                                >
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-5 h-5 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[oklch(0.15_0.02_45)] dark:text-white truncate">{product.name}</p>
                                    <p className="text-sm text-[oklch(0.55_0.02_45)]">
                                      UGX {product.price?.toLocaleString()} · {product.storeName}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Categories */}
                        {searchResults.categories.length > 0 && (
                          <div className="p-4 border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
                            <h3 className="text-xs font-semibold text-[oklch(0.55_0.02_45)] uppercase tracking-wider mb-3">Categories</h3>
                            <div className="flex flex-wrap gap-2">
                              {searchResults.categories.map((category) => (
                                <Link
                                  key={category.id}
                                  href={`/categories/${category.slug}`}
                                  onClick={() => {
                                    setShowSearchResults(false)
                                    setSearchQuery('')
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.22_0.02_45)] hover:bg-[oklch(0.92_0.02_85)] dark:hover:bg-[oklch(0.28_0.02_45)] transition-colors"
                                >
                                  {category.icon && <span>{category.icon}</span>}
                                  <span className="text-sm font-medium text-[oklch(0.25_0.02_45)] dark:text-white">{category.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stores */}
                        {searchResults.stores.length > 0 && (
                          <div className="p-4 border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
                            <h3 className="text-xs font-semibold text-[oklch(0.55_0.02_45)] uppercase tracking-wider mb-3">Stores</h3>
                            <div className="space-y-2">
                              {searchResults.stores.slice(0, 3).map((store) => (
                                <Link
                                  key={store.id}
                                  href={`/stores/${store.slug}`}
                                  onClick={() => {
                                    setShowSearchResults(false)
                                    setSearchQuery('')
                                  }}
                                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
                                >
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_35)] to-[oklch(0.55_0.15_140)] flex items-center justify-center text-white font-bold">
                                    {store.logo ? (
                                      <img src={store.logo} alt={store.name} className="w-full h-full rounded-full object-cover" loading="lazy" decoding="async" />
                                    ) : (
                                      store.name[0].toUpperCase()
                                    )}
                                  </div>
                                  <span className="font-medium text-[oklch(0.15_0.02_45)] dark:text-white">{store.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No results */}
                        {searchResults.products.length === 0 && 
                         searchResults.categories.length === 0 && 
                         searchResults.stores.length === 0 && (
                          <div className="p-8 text-center">
                            <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No results found for &quot;{searchQuery}&quot;</p>
                            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                          </div>
                        )}

                        {/* View all results */}
                        {(searchResults.products.length > 0 || searchResults.categories.length > 0 || searchResults.stores.length > 0) && (
                          <div className="p-4 border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
                            <button
                              type="submit"
                              className="w-full py-2 text-center text-sm font-medium text-[oklch(0.6_0.2_35)] hover:text-[oklch(0.55_0.15_140)] transition-colors"
                            >
                              View all results for &quot;{searchQuery}&quot; →
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 lg:gap-2">
              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsDark(!isDark)}
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
              >
                {isDark ? <Sun className="w-5 h-5 text-[oklch(0.75_0.14_80)]" /> : <Moon className="w-5 h-5 text-[oklch(0.45_0.02_45)]" />}
              </motion.button>

              {/* Wishlist */}
              <Link href="/dashboard/wishlist">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center px-3 py-1.5 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] cursor-pointer transition-colors"
                >
                  <Heart className="w-5 h-5 text-[oklch(0.45_0.02_45)] dark:text-white" />
                  <span className="hidden lg:block text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mt-0.5">Wishlist</span>
                </motion.div>
              </Link>

              {/* Cart */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={openCart}
                className="relative flex flex-col items-center px-3 py-1.5 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] cursor-pointer transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-[oklch(0.45_0.02_45)] dark:text-white" />
                <span className="hidden lg:block text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mt-0.5">Cart</span>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(0.55 0.15 140), oklch(0.45 0.14 155))' }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Auth Section */}
              {!isLoaded || roleLoading ? (
                <div className="hidden md:flex w-10 h-10 items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[oklch(0.6_0.2_35)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !isSignedIn ? (
                <SignInButton mode="modal">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
                  >
                    <LogIn className="w-5 h-5 text-[oklch(0.45_0.02_45)] dark:text-white" />
                    <span className="text-sm font-medium text-[oklch(0.25_0.02_45)] dark:text-white">Sign In</span>
                  </motion.button>
                </SignInButton>
              ) : (
                <div className="hidden md:block relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
                  >
                    <UserButton />
                    <ChevronDown className={`w-4 h-4 text-[oklch(0.45_0.02_45)] dark:text-white transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[oklch(0.18_0.02_45)] rounded-2xl shadow-xl border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.28_0.02_45)] overflow-hidden z-50"
                      >
                        {/* Role Badge */}
                        {userRole && (
                          <div className="px-4 py-3 border-b border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.28_0.02_45)]">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              userRole.isSuperAdmin 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                : userRole.isAdmin 
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : userRole.isSeller
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {userRole.isSuperAdmin && <Shield className="w-3 h-3" />}
                              {userRole.isSuperAdmin ? 'Super Admin' : userRole.isAdmin ? 'Admin' : userRole.isSeller ? 'Seller' : 'Buyer'}
                            </span>
                          </div>
                        )}

                        {/* Navigation Items */}
                        <div className="py-2">
                          {getUserNavItems().map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
                            >
                              <item.icon className="w-4 h-4 text-[oklch(0.55_0.15_140)]" />
                              <span className="text-sm font-medium text-[oklch(0.25_0.02_45)] dark:text-white">{item.label}</span>
                            </Link>
                          ))}
                        </div>

                        {/* Sign Out */}
                        <div className="border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.28_0.02_45)] py-2">
                          <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                          >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Sell Button - Only show for non-sellers */}
              {(!isSignedIn || !userRole?.isSeller) && (
                <Link href="/seller/register" className="hidden lg:block">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 10px 30px oklch(0.6 0.2 35 / 30%)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg"
                    style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                  >
                    Start Selling
                  </motion.button>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-[oklch(0.45_0.02_45)] dark:text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-[oklch(0.45_0.02_45)] dark:text-white" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Categories Navigation */}
          <nav className="hidden md:block border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
            <div className="flex items-center gap-1 py-2 overflow-x-auto custom-scrollbar">
              {categories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={category.href}>
                    <motion.div
                      whileHover={{ y: -2, backgroundColor: 'oklch(0.96 0.01 85)' }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[oklch(0.45_0.02_45)] dark:text-white whitespace-nowrap transition-colors cursor-pointer"
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categories.length * 0.05 }}
              >
                <Link href="/categories">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer text-[oklch(0.6_0.2_35)]"
                  >
                    All Categories
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[140px] z-40 bg-white dark:bg-[oklch(0.12_0.02_45)] shadow-2xl rounded-b-3xl overflow-hidden md:hidden"
          >
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Categories */}
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category) => (
                  <Link key={category.name} href={category.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.18_0.02_45)]"
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-medium text-[oklch(0.25_0.02_45)] dark:text-white">{category.name}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>

              {/* User Actions */}
              {isSignedIn && (
                <div className="pt-4 border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] space-y-2">
                  {/* Role Badge */}
                  {userRole && (
                    <div className="px-2 py-2">
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                        userRole.isSuperAdmin 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                          : userRole.isAdmin 
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : userRole.isSeller
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {userRole.isSuperAdmin && <Shield className="w-3 h-3" />}
                        {userRole.isSuperAdmin ? 'Super Admin' : userRole.isAdmin ? 'Admin' : userRole.isSeller ? 'Seller' : 'Buyer'}
                      </span>
                    </div>
                  )}
                  
                  {getUserNavItems().map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-[oklch(0.55_0.15_140)]" />
                      <span className="font-medium text-[oklch(0.25_0.02_45)] dark:text-white">{item.label}</span>
                    </Link>
                  ))}

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      handleSignOut()
                    }}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              )}

              {/* Auth / Sell Buttons */}
              {!isSignedIn && (
                <div className="pt-4 border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] space-y-3">
                  <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                    >
                      Sign In
                    </motion.button>
                  </Link>
                </div>
              )}

              {/* Start Selling - Only for non-sellers */}
              {(!isSignedIn || !userRole?.isSeller) && (
                <Link href="/seller/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl font-semibold border-2 border-[oklch(0.6_0.2_35)] text-[oklch(0.6_0.2_35)] dark:text-white"
                  >
                    Start Selling
                  </motion.button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close dropdown */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </>
  )
}
