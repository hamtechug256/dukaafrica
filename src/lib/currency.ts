/**
 * DuukaAfrica Currency Utilities
 * 
 * Handles currency conversion and display for the multi-country marketplace.
 * Sellers price in their local currency, buyers see prices converted to their currency.
 */

import { Currency, Country } from '@prisma/client'

// ============================================
// CURRENCY SYMBOLS AND FORMATTING
// ============================================

export const CURRENCY_INFO: Record<Currency, {
  symbol: string
  name: string
  decimals: number
  locale: string
}> = {
  UGX: {
    symbol: 'UGX',
    name: 'Ugandan Shilling',
    decimals: 0, // UGX doesn't use decimals
    locale: 'ug-UG'
  },
  KES: {
    symbol: 'KES',
    name: 'Kenyan Shilling',
    decimals: 2,
    locale: 'ke-KE'
  },
  TZS: {
    symbol: 'TZS',
    name: 'Tanzanian Shilling',
    decimals: 0, // TZS typically doesn't use decimals
    locale: 'tz-TZ'
  },
  RWF: {
    symbol: 'RWF',
    name: 'Rwandan Franc',
    decimals: 0, // RWF doesn't use decimals
    locale: 'rw-RW'
  }
}

// ============================================
// COUNTRY TO CURRENCY MAPPING
// ============================================

export const COUNTRY_CURRENCY: Record<Country, Currency> = {
  UGANDA: 'UGX',
  KENYA: 'KES',
  TANZANIA: 'TZS',
  RWANDA: 'RWF'
}

export const CURRENCY_COUNTRY: Record<Currency, Country> = {
  UGX: 'UGANDA',
  KES: 'KENYA',
  TZS: 'TANZANIA',
  RWF: 'RWANDA'
}

// ============================================
// EXCHANGE RATES (Approximate - Updated Periodically)
// These are approximate rates. Flutterwave handles actual conversion.
// ============================================

export const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  UGX: {
    UGX: 1,
    KES: 0.035,      // 1 UGX ≈ 0.035 KES
    TZS: 0.27,       // 1 UGX ≈ 0.27 TZS
    RWF: 0.26        // 1 UGX ≈ 0.26 RWF
  },
  KES: {
    UGX: 28.57,      // 1 KES ≈ 28.57 UGX
    KES: 1,
    TZS: 7.71,       // 1 KES ≈ 7.71 TZS
    RWF: 7.43        // 1 KES ≈ 7.43 RWF
  },
  TZS: {
    UGX: 3.70,       // 1 TZS ≈ 3.70 UGX
    KES: 0.13,       // 1 TZS ≈ 0.13 KES
    TZS: 1,
    RWF: 0.96        // 1 TZS ≈ 0.96 RWF
  },
  RWF: {
    UGX: 3.85,       // 1 RWF ≈ 3.85 UGX
    KES: 0.13,       // 1 RWF ≈ 0.13 KES
    TZS: 1.04,       // 1 RWF ≈ 1.04 TZS
    RWF: 1
  }
}

// ============================================
// CURRENCY CONVERSION BUFFER
// Added to protect against currency fluctuation
// ============================================

export const CURRENCY_BUFFER_PERCENT = 1.5 // 1.5% buffer

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  includeBuffer: boolean = true
): number {
  if (fromCurrency === toCurrency) return amount

  const rate = EXCHANGE_RATES[fromCurrency]?.[toCurrency] ?? 1
  let converted = amount * rate

  // Add buffer to protect against fluctuation (only for display, not actual payment)
  if (includeBuffer) {
    converted = converted * (1 + CURRENCY_BUFFER_PERCENT / 100)
  }

  return Math.round(converted)
}

/**
 * Format a price for display
 */
export function formatPrice(
  amount: number,
  currency: Currency,
  showSymbol: boolean = true
): string {
  const info = CURRENCY_INFO[currency]
  
  // Format number with proper separators
  const formatted = new Intl.NumberFormat(info.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: info.decimals
  }).format(amount)

  return showSymbol ? `${info.symbol} ${formatted}` : formatted
}

/**
 * Format a price with both currencies shown (for cross-border listings)
 */
export function formatPriceWithConversion(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): { original: string; converted: string } {
  const converted = convertCurrency(amount, fromCurrency, toCurrency)
  
  return {
    original: formatPrice(amount, fromCurrency),
    converted: formatPrice(converted, toCurrency)
  }
}

/**
 * Get the exchange rate between two currencies
 */
export function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  return EXCHANGE_RATES[fromCurrency]?.[toCurrency] ?? 1
}

/**
 * Get currency for a country
 */
export function getCurrencyForCountry(country: Country): Currency {
  return COUNTRY_CURRENCY[country]
}

/**
 * Get country for a currency
 */
export function getCountryForCurrency(currency: Currency): Country {
  return CURRENCY_COUNTRY[currency]
}

// ============================================
// MOBILE MONEY PROVIDERS BY COUNTRY
// ============================================

export const MOBILE_MONEY_PROVIDERS: Record<Country, Array<{
  id: string
  name: string
  paymentCode: string
}>> = {
  UGANDA: [
    { id: 'mtn_ug', name: 'MTN Mobile Money', paymentCode: 'mtn_ug' },
    { id: 'airtel_ug', name: 'Airtel Money', paymentCode: 'airtel_ug' }
  ],
  KENYA: [
    { id: 'mpesa_ke', name: 'M-Pesa', paymentCode: 'mpesa' },
    { id: 'airtel_ke', name: 'Airtel Money', paymentCode: 'airtel_ke' }
  ],
  TANZANIA: [
    { id: 'mpesa_tz', name: 'M-Pesa', paymentCode: 'mpesa_tz' },
    { id: 'airtel_tz', name: 'Airtel Money', paymentCode: 'airtel_tz' },
    { id: 'tigo_tz', name: 'Tigo Pesa', paymentCode: 'tigo_tz' }
  ],
  RWANDA: [
    { id: 'mtn_rw', name: 'MTN Mobile Money', paymentCode: 'mtn_rw' },
    { id: 'airtel_rw', name: 'Airtel Money', paymentCode: 'airtel_rw' }
  ]
}

// ============================================
// COUNTRY FLAGS AND NAMES
// ============================================

export const COUNTRY_INFO: Record<Country, {
  name: string
  flag: string
  phoneCode: string
}> = {
  UGANDA: {
    name: 'Uganda',
    flag: '🇺🇬',
    phoneCode: '+256'
  },
  KENYA: {
    name: 'Kenya',
    flag: '🇰🇪',
    phoneCode: '+254'
  },
  TANZANIA: {
    name: 'Tanzania',
    flag: '🇹🇿',
    phoneCode: '+255'
  },
  RWANDA: {
    name: 'Rwanda',
    flag: '🇷🇼',
    phoneCode: '+250'
  }
}
