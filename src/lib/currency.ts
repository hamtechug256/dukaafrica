/**
 * DuukaAfrica Currency Utilities
 * 
 * SINGLE SOURCE OF TRUTH for all country/currency operations.
 * Every other file should import from here — NO duplicates.
 * 
 * Sellers price in their local currency, buyers see prices converted to their currency.
 */

// Define types locally since Prisma uses strings instead of enums
export type Currency = 'UGX' | 'KES' | 'TZS' | 'RWF' | 'SSP' | 'BIF'
export type Country = 'UGANDA' | 'KENYA' | 'TANZANIA' | 'RWANDA' | 'SOUTH_SUDAN' | 'BURUNDI'

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
    decimals: 0,
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
    decimals: 0,
    locale: 'tz-TZ'
  },
  RWF: {
    symbol: 'RWF',
    name: 'Rwandan Franc',
    decimals: 0,
    locale: 'rw-RW'
  },
  SSP: {
    symbol: 'SSP',
    name: 'South Sudanese Pound',
    decimals: 2,
    locale: 'ss-SS'
  },
  BIF: {
    symbol: 'BIF',
    name: 'Burundian Franc',
    decimals: 0,
    locale: 'bi-BI'
  },
}

// ============================================
// COUNTRY TO CURRENCY MAPPING
// ============================================

export const COUNTRY_CURRENCY: Record<Country, Currency> = {
  UGANDA: 'UGX',
  KENYA: 'KES',
  TANZANIA: 'TZS',
  RWANDA: 'RWF',
  SOUTH_SUDAN: 'SSP',
  BURUNDI: 'BIF',
}

export const CURRENCY_COUNTRY: Record<Currency, Country> = {
  UGX: 'UGANDA',
  KES: 'KENYA',
  TZS: 'TANZANIA',
  RWF: 'RWANDA',
  SSP: 'SOUTH_SUDAN',
  BIF: 'BURUNDI',
}

// ============================================
// REGULATORY BODY PER COUNTRY
// Used in checkout/payment UI to show correct regulator
// ============================================

export const COUNTRY_REGULATOR: Record<Country, string> = {
  UGANDA: 'Bank of Uganda',
  KENYA: 'Central Bank of Kenya',
  TANZANIA: 'Bank of Tanzania',
  RWANDA: 'National Bank of Rwanda',
  SOUTH_SUDAN: 'Bank of South Sudan',
  BURUNDI: 'Bank of the Republic of Burundi',
}

// ============================================
// COUNTRY FLAGS AND NAMES
// ============================================

export const COUNTRY_INFO: Record<Country, {
  name: string
  flag: string
  phoneCode: string
  locale: string
}> = {
  UGANDA: {
    name: 'Uganda',
    flag: '🇺🇬',
    phoneCode: '+256',
    locale: 'en-UG'
  },
  KENYA: {
    name: 'Kenya',
    flag: '🇰🇪',
    phoneCode: '+254',
    locale: 'en-KE'
  },
  TANZANIA: {
    name: 'Tanzania',
    flag: '🇹🇿',
    phoneCode: '+255',
    locale: 'sw-TZ'
  },
  RWANDA: {
    name: 'Rwanda',
    flag: '🇷🇼',
    phoneCode: '+250',
    locale: 'rw-RW'
  },
  SOUTH_SUDAN: {
    name: 'South Sudan',
    flag: '🇸🇸',
    phoneCode: '+211',
    locale: 'en-SS'
  },
  BURUNDI: {
    name: 'Burundi',
    flag: '🇧🇮',
    phoneCode: '+257',
    locale: 'fr-BI'
  },
}

// ============================================
// PHONE VALIDATION PATTERNS PER COUNTRY
// ============================================

export const PHONE_PATTERNS: Record<Country, { pattern: RegExp; placeholder: string; label: string }> = {
  UGANDA:    { pattern: /^(\+256|0)7[0-9]{8}$/,              placeholder: '+256 7XX XXX XXX', label: 'Ugandan' },
  KENYA:     { pattern: /^(\+254|0)(7[0-9]{8}|1[01][0-9]{7})$/, placeholder: '+254 7XX XXX XXX', label: 'Kenyan' },
  TANZANIA:  { pattern: /^(\+255|0)(6[0-9]{8}|7[0-9]{8})$/,  placeholder: '+255 6XX XXX XXX', label: 'Tanzanian' },
  RWANDA:    { pattern: /^(\+250|0)7[38][0-9]{7}$/,          placeholder: '+250 7XX XXX XXX', label: 'Rwandan' },
  SOUTH_SUDAN: { pattern: /^(\+211|0)9[0-9]{8}$/,           placeholder: '+211 9XX XXX XXX', label: 'South Sudanese' },
  BURUNDI:   { pattern: /^(\+257|0)7[0-9]{8}$/,             placeholder: '+257 7XX XXX XXX', label: 'Burundian' },
}

// ============================================
// CITIES PER COUNTRY (for ticker, random display, etc.)
// ============================================

export const COUNTRY_CITIES: Record<Country, string[]> = {
  UGANDA: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Fort Portal', 'Arua', 'Mbale'],
  KENYA: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Nyeri'],
  TANZANIA: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Zanzibar', 'Mbeya', 'Morogoro', 'Tanga'],
  RWANDA: ['Kigali', 'Gitarama', 'Butare', 'Ruhengeri', 'Gisenyi', 'Byumba', 'Cyangugu', 'Kibuye'],
  SOUTH_SUDAN: ['Juba', 'Wau', 'Malakal', 'Yei', 'Bor', 'Nimule', 'Rumbek', 'Torit'],
  BURUNDI: ['Bujumbura', 'Gitega', 'Ngozi', 'Ruyigi', 'Muyinga', 'Bururi', 'Rutana', 'Cankuzo'],
}

// ============================================
// EXCHANGE RATES (Approximate - Updated Periodically)
// These are approximate rates. Pesapal handles actual conversion.
// ============================================

export const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  UGX: {
    UGX: 1,
    KES: 0.035,
    TZS: 0.27,
    RWF: 0.26,
    SSP: 0.18,
    BIF: 0.53,
  },
  KES: {
    UGX: 28.57,
    KES: 1,
    TZS: 7.71,
    RWF: 7.43,
    SSP: 5.14,
    BIF: 15.14,
  },
  TZS: {
    UGX: 3.70,
    KES: 0.13,
    TZS: 1,
    RWF: 0.96,
    SSP: 0.67,
    BIF: 1.96,
  },
  RWF: {
    UGX: 3.85,
    KES: 0.13,
    TZS: 1.04,
    RWF: 1,
    SSP: 0.69,
    BIF: 2.03,
  },
  SSP: {
    UGX: 5.56,
    KES: 0.19,
    TZS: 1.48,
    RWF: 1.44,
    SSP: 1,
    BIF: 2.94,
  },
  BIF: {
    UGX: 1.89,
    KES: 0.066,
    TZS: 0.51,
    RWF: 0.49,
    SSP: 0.34,
    BIF: 1,
  },
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
  currency: Currency | string,
  showSymbol: boolean = true
): string {
  const info = CURRENCY_INFO[currency as Currency] || CURRENCY_INFO.UGX

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
export function getCurrencyForCountry(country: string): Currency {
  return COUNTRY_CURRENCY[country as Country] || 'UGX'
}

/**
 * Get country for a currency
 */
export function getCountryForCurrency(currency: string): Country {
  return CURRENCY_COUNTRY[currency as Currency] || 'UGANDA'
}

/**
 * Get the regulatory body for a country (e.g., "Bank of Uganda")
 */
export function getRegulatorForCountry(country: string): string {
  return COUNTRY_REGULATOR[country as Country] || 'relevant financial authority'
}

/**
 * Get a random city from a country (for ticker, social proof, etc.)
 */
export function getRandomCity(country: string): string {
  const cities = COUNTRY_CITIES[country as Country]
  if (!cities || cities.length === 0) return 'East Africa'
  return cities[Math.floor(Math.random() * cities.length)]
}

/**
 * Get country info (flag, name, phone code)
 */
export function getCountryInfo(country: string) {
  return COUNTRY_INFO[country as Country] || COUNTRY_INFO.UGANDA
}

/**
 * Get currency info (symbol, name, decimals, locale)
 */
export function getCurrencyInfo(currency: string) {
  return CURRENCY_INFO[currency as Currency] || CURRENCY_INFO.UGX
}

/**
 * Get phone validation config for a country
 */
export function getPhonePattern(country: string) {
  return PHONE_PATTERNS[country as Country] || PHONE_PATTERNS.UGANDA
}

/**
 * Safe currency/country resolution for any string input
 * Returns a valid Currency even if input is null/undefined
 */
export function resolveCurrency(currency: string | null | undefined, fallbackCountry?: string): Currency {
  if (currency && currency in CURRENCY_INFO) return currency as Currency
  if (fallbackCountry && fallbackCountry in COUNTRY_CURRENCY) return COUNTRY_CURRENCY[fallbackCountry as Country]
  return 'UGX'
}

/**
 * Safe country resolution for any string input
 * Returns a valid Country even if input is null/undefined
 */
export function resolveCountry(country: string | null | undefined): Country {
  if (country && country in COUNTRY_INFO) return country as Country
  return 'UGANDA'
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
  ],
  SOUTH_SUDAN: [
    { id: 'mtn_ss', name: 'MTN Mobile Money', paymentCode: 'mtn_ss' },
    { id: 'zain_ss', name: 'Zain (Zap)', paymentCode: 'zain_ss' },
  ],
  BURUNDI: [
    { id: 'lumitel_bi', name: 'Lumitel (M-Pesa)', paymentCode: 'lumitel_bi' },
    { id: 'econet_bi', name: 'Econet (EcoCash)', paymentCode: 'econet_bi' },
  ],
}
