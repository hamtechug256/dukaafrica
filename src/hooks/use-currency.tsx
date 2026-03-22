'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useMemo, createContext, useContext, ReactNode } from 'react'
import { Currency, Country } from '@prisma/client'
import {
  convertCurrency,
  formatPrice,
  formatPriceWithConversion,
  CURRENCY_INFO,
  COUNTRY_CURRENCY,
  COUNTRY_INFO,
  MOBILE_MONEY_PROVIDERS,
  getCurrencyForCountry,
} from '@/lib/currency'

// ============================================
// CURRENCY CONTEXT
// ============================================

interface CurrencyContextType {
  // User's settings
  userCountry: Country | null
  userCurrency: Currency | null
  isLoading: boolean
  
  // Conversion functions
  convertToUserCurrency: (amount: number, fromCurrency: Currency) => number
  formatInUserCurrency: (amount: number, fromCurrency: Currency) => string
  formatPrice: (amount: number, currency: Currency) => string
  
  // Display helpers
  formatWithOriginal: (amount: number, fromCurrency: Currency) => {
    original: string
    converted: string
    showConverted: boolean
  }
  
  // Country/Currency info
  getCountryInfo: (country: Country) => { name: string; flag: string; phoneCode: string }
  getCurrencyInfo: (currency: Currency) => { symbol: string; name: string }
  getMobileMoneyProviders: (country: Country) => Array<{ id: string; name: string }>
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  
  // Compute country and currency from user metadata (derived state)
  const userCountry = useMemo(() => {
    if (!isLoaded || !user) return null
    const metadata = user.unsafeMetadata as { country?: string }
    return metadata.country ? (metadata.country as Country) : null
  }, [isLoaded, user])
  
  const userCurrency = useMemo(() => {
    if (!isLoaded || !user) return null
    const metadata = user.unsafeMetadata as { currency?: string; country?: string }
    
    if (metadata.currency) {
      return metadata.currency as Currency
    }
    if (metadata.country) {
      return getCurrencyForCountry(metadata.country as Country)
    }
    return null
  }, [isLoaded, user])
  
  const value: CurrencyContextType = useMemo(() => ({
    userCountry,
    userCurrency,
    isLoading: !isLoaded,
    
    convertToUserCurrency: (amount: number, fromCurrency: Currency) => {
      if (!userCurrency) return amount
      return convertCurrency(amount, fromCurrency, userCurrency)
    },
    
    formatInUserCurrency: (amount: number, fromCurrency: Currency) => {
      if (!userCurrency) return formatPrice(amount, fromCurrency)
      
      if (fromCurrency === userCurrency) {
        return formatPrice(amount, userCurrency)
      }
      
      const converted = convertCurrency(amount, fromCurrency, userCurrency)
      return formatPrice(converted, userCurrency)
    },
    
    formatPrice: (amount: number, currency: Currency) => {
      return formatPrice(amount, currency)
    },
    
    formatWithOriginal: (amount: number, fromCurrency: Currency) => {
      if (!userCurrency || fromCurrency === userCurrency) {
        return {
          original: formatPrice(amount, fromCurrency),
          converted: formatPrice(amount, fromCurrency),
          showConverted: false
        }
      }
      
      const { original, converted } = formatPriceWithConversion(amount, fromCurrency, userCurrency)
      return { original, converted, showConverted: true }
    },
    
    getCountryInfo: (country: Country) => COUNTRY_INFO[country],
    getCurrencyInfo: (currency: Currency) => CURRENCY_INFO[currency],
    getMobileMoneyProviders: (country: Country) => MOBILE_MONEY_PROVIDERS[country]
  }), [userCountry, userCurrency, isLoaded])
  
  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useCurrency() {
  const context = useContext(CurrencyContext)
  
  if (!context) {
    // Return default values if not in provider
    return {
      userCountry: null,
      userCurrency: null,
      isLoading: true,
      convertToUserCurrency: (amount: number) => amount,
      formatInUserCurrency: (amount: number, currency: Currency) => formatPrice(amount, currency),
      formatPrice: (amount: number, currency: Currency) => formatPrice(amount, currency),
      formatWithOriginal: (amount: number, currency: Currency) => ({
        original: formatPrice(amount, currency),
        converted: formatPrice(amount, currency),
        showConverted: false
      }),
      getCountryInfo: (country: Country) => COUNTRY_INFO[country],
      getCurrencyInfo: (currency: Currency) => CURRENCY_INFO[currency],
      getMobileMoneyProviders: (country: Country) => MOBILE_MONEY_PROVIDERS[country]
    }
  }
  
  return context
}

// ============================================
// PRICE DISPLAY COMPONENT
// ============================================

interface PriceDisplayProps {
  amount: number
  currency: Currency
  showOriginal?: boolean
  className?: string
  originalClassName?: string
}

export function PriceDisplay({ 
  amount, 
  currency, 
  showOriginal = true,
  className = '',
  originalClassName = 'text-sm text-muted-foreground line-through'
}: PriceDisplayProps) {
  const { formatWithOriginal } = useCurrency()
  const { original, converted, showConverted } = formatWithOriginal(amount, currency)
  
  if (!showConverted || !showOriginal) {
    return <span className={className}>{converted}</span>
  }
  
  return (
    <div className="flex flex-col">
      <span className={className}>{converted}</span>
      <span className={originalClassName}>{original}</span>
    </div>
  )
}
