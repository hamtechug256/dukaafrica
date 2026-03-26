'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs'
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
  Sparkles
} from 'lucide-react'

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

export function Header() {
  const { isSignedIn, isLoaded } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0])

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
            <div className="flex-1 max-w-2xl">
              <motion.div
                animate={{ scale: isSearchFocused ? 1.02 : 1 }}
                className={`relative rounded-2xl transition-all duration-300 ${
                  isSearchFocused
                    ? 'shadow-lg ring-2 ring-[oklch(0.6_0.2_35)]/30'
                    : 'shadow-sm'
                }`}
              >
                <input
                  type="search"
                  placeholder="Search for products, brands, categories..."
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full h-12 pl-12 pr-14 rounded-2xl border border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.28_0.02_45)] bg-[oklch(0.98_0.005_85)] dark:bg-[oklch(0.18_0.02_45)] text-[oklch(0.15_0.02_45)] dark:text-white placeholder:text-[oklch(0.55_0.02_45)] focus:outline-none focus:border-[oklch(0.6_0.2_35)] transition-colors"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.55_0.02_45)]" />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                >
                  <Search className="w-4 h-4" />
                </motion.button>
              </motion.div>
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
              <Link href="/cart">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative flex flex-col items-center px-3 py-1.5 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] cursor-pointer transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 text-[oklch(0.45_0.02_45)] dark:text-white" />
                  <span className="hidden lg:block text-xs text-[oklch(0.55_0.02_45)] dark:text-[oklch(0.65_0.01_85)] mt-0.5">Cart</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(0.55 0.15 140), oklch(0.45 0.14 155))' }}
                  >
                    3
                  </motion.span>
                </motion.div>
              </Link>

              {/* Auth Section */}
              {!isLoaded ? (
                <div className="hidden md:flex w-10 h-10 items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[oklch(0.6_0.2_35)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : isSignedIn ? (
                <div className="hidden md:flex items-center">
                  <UserButton />
                </div>
              ) : (
                <Link href="/sign-in">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.22_0.02_45)] transition-colors"
                  >
                    <User className="w-5 h-5 text-[oklch(0.45_0.02_45)] dark:text-white" />
                    <span className="text-sm font-medium text-[oklch(0.25_0.02_45)] dark:text-white">Sign In</span>
                  </motion.button>
                </Link>
              )}

              {/* Sell Button */}
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
            <div className="p-6 space-y-4">
              {/* Categories */}
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category) => (
                  <Link key={category.name} href={category.href}>
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

              {/* Actions */}
              <div className="pt-4 border-t border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)] space-y-3">
                {!isLoaded ? (
                  <div className="flex justify-center py-3">
                    <div className="w-6 h-6 border-2 border-[oklch(0.6_0.2_35)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : isSignedIn ? (
                  <div className="flex justify-center">
                    <UserButton />
                  </div>
                ) : (
                  <Link href="/sign-in">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                    >
                      Sign In
                    </motion.button>
                  </Link>
                )}
                <Link href="/seller/register">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl font-semibold border-2 border-[oklch(0.6_0.2_35)] text-[oklch(0.6_0.2_35)] dark:text-white"
                  >
                    Start Selling
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
