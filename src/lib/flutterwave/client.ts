/**
 * DuukaAfrica Flutterwave Integration
 * 
 * Handles:
 * - Payment collection with split payments
 * - Subaccount management for sellers
 * - Mobile money payments across East Africa
 * - Webhook handling for payment confirmation
 * 
 * Configuration: Reads from database (PlatformSettings) first, falls back to env vars
 */

import { prisma } from '@/lib/db'

// ============================================
// FLUTTERWAVE CONFIGURATION
// ============================================

// Environment variable fallbacks
const ENV_CONFIG = {
  baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
  publicKey: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '',
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
  encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || '',
  webhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH || '',
}

// Cached config from database
let cachedConfig: {
  publicKey: string
  secretKey: string
  encryptionKey: string
  webhookHash: string
  lastFetched: number
} | null = null

const CONFIG_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get Flutterwave configuration
 * Priority: Database (PlatformSettings) > Environment Variables
 */
export async function getFlutterwaveConfig(): Promise<{
  baseUrl: string
  publicKey: string
  secretKey: string
  encryptionKey: string
  webhookHash: string
}> {
  // Check cache first
  if (cachedConfig && Date.now() - cachedConfig.lastFetched < CONFIG_CACHE_TTL) {
    return {
      baseUrl: ENV_CONFIG.baseUrl,
      ...cachedConfig,
    }
  }

  try {
    // Try to get from database
    const platformSettings = await prisma.platformSettings.findFirst()
    
    if (platformSettings) {
      cachedConfig = {
        publicKey: platformSettings.flutterwavePublicKey || ENV_CONFIG.publicKey,
        secretKey: platformSettings.flutterwaveSecretKey || ENV_CONFIG.secretKey,
        encryptionKey: platformSettings.flutterwaveEncryptionKey || ENV_CONFIG.encryptionKey,
        webhookHash: platformSettings.flutterwaveWebhookSecret || ENV_CONFIG.webhookHash,
        lastFetched: Date.now(),
      }
      
      return {
        baseUrl: ENV_CONFIG.baseUrl,
        ...cachedConfig,
      }
    }
  } catch (error) {
    console.warn('Could not fetch Flutterwave config from database, using env vars:', error)
  }

  // Fall back to environment variables
  return ENV_CONFIG
}

/**
 * Get public config (for client-side use)
 * This only returns the public key, never the secret
 */
export function getPublicFlutterwaveConfig(): { publicKey: string; baseUrl: string } {
  return {
    publicKey: ENV_CONFIG.publicKey,
    baseUrl: ENV_CONFIG.baseUrl,
  }
}

// Legacy sync config for backward compatibility (uses env vars only)
export const FLUTTERWAVE_CONFIG = {
  get baseUrl() { return ENV_CONFIG.baseUrl },
  get publicKey() { return ENV_CONFIG.publicKey },
  get secretKey() { return ENV_CONFIG.secretKey },
  get encryptionKey() { return ENV_CONFIG.encryptionKey },
  get webhookHash() { return ENV_CONFIG.webhookHash },
}

// ============================================
// CURRENCY TO FLUTTERWAVE COUNTRY CODE
// ============================================

type Country = 'UGANDA' | 'KENYA' | 'TANZANIA' | 'RWANDA'
type Currency = 'UGX' | 'KES' | 'TZS' | 'RWF'

export const COUNTRY_TO_FW_COUNTRY: Record<Country, string> = {
  UGANDA: 'UG',
  KENYA: 'KE',
  TANZANIA: 'TZ',
  RWANDA: 'RW'
}

export const CURRENCY_TO_FW_CURRENCY: Record<Currency, string> = {
  UGX: 'UGX',
  KES: 'KES',
  TZS: 'TZS',
  RWF: 'RWF'
}

// ============================================
// MOBILE MONEY PAYMENT METHODS
// ============================================

export const MOBILE_MONEY_METHODS: Record<Country, string> = {
  UGANDA: 'mobilemoneyuganda',
  KENYA: 'mpesa',
  TANZANIA: 'mobilemoneytanzania',
  RWANDA: 'mobilemoneyrwanda'
}

// ============================================
// INTERFACES
// ============================================

export interface FlutterwavePaymentRequest {
  tx_ref: string
  amount: number
  currency: string
  customer: {
    email: string
    phone_number?: string
    name: string
  }
  customizations: {
    title: string
    description: string
    logo?: string
  }
  subaccounts?: Array<{
    id: string
    transaction_charge_type?: 'flat' | 'percentage'
    transaction_charge?: number
  }>,
  meta?: Record<string, string | number>
}

export interface FlutterwavePaymentResponse {
  status: string
  message: string
  data: {
    link: string
    id: number
    tx_ref: string
  }
}

export interface FlutterwaveSubaccountRequest {
  account_bank: string
  account_number: string
  business_name: string
  business_email: string
  business_contact: string
  business_contact_mobile: string
  business_mobile: string
  country: string
  split_type?: 'flat' | 'percentage'
  split_value?: number
}

export interface FlutterwaveSubaccountResponse {
  status: string
  message: string
  data: {
    id: number
    account_id: number
    subaccount_id: string
    account_name: string
    bank_name: string
    account_number: string
  }
}

export interface FlutterwaveWebhookPayload {
  event: string
  'data.id': number
  tx_ref: string
  flw_ref: string
  amount: number
  currency: string
  charged_amount: number
  app_fee: number
  merchant_fee: number
  status: 'successful' | 'failed' | 'cancelled'
  payment_type: string
  customer: {
    id: number
    name: string
    phone_number: string
    email: string
  }
  [key: string]: unknown
}

// ============================================
// FLUTTERWAVE API CLIENT
// ============================================

class FlutterwaveClient {
  private getBaseUrl: () => string
  private getSecretKey: () => string

  constructor() {
    // Use getters for dynamic config access
    this.getBaseUrl = () => FLUTTERWAVE_CONFIG.baseUrl
    this.getSecretKey = () => FLUTTERWAVE_CONFIG.secretKey
  }

  /**
   * Initialize client with database config (call before operations)
   */
  async initialize(): Promise<void> {
    const config = await getFlutterwaveConfig()
    this.getBaseUrl = () => config.baseUrl
    this.getSecretKey = () => config.secretKey
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown
  ): Promise<T> {
    // Ensure we have latest config from database
    const config = await getFlutterwaveConfig()
    const url = `${config.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.secretKey}`
    }

    const options: RequestInit = {
      method,
      headers,
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Flutterwave API error: ${JSON.stringify(result)}`)
    }

    return result as T
  }

  // ============================================
  // PAYMENT METHODS
  // ============================================

  /**
   * Initialize a payment
   */
  async initializePayment(
    paymentData: FlutterwavePaymentRequest
  ): Promise<FlutterwavePaymentResponse> {
    return this.request<FlutterwavePaymentResponse>('/payments', 'POST', paymentData)
  }

  /**
   * Verify a payment
   */
  async verifyPayment(transactionId: string): Promise<{
    status: string
    data: {
      id: number
      tx_ref: string
      flw_ref: string
      amount: number
      currency: string
      charged_amount: number
      app_fee: number
      merchant_fee: number
      status: string
      payment_type: string
      customer: { id: number; email: string; name: string; phone_number: string }
    }
  }> {
    return this.request(`/transactions/${transactionId}/verify`)
  }

  /**
   * Create a transfer (for payouts)
   */
  async createTransfer(data: {
    account_bank: string
    account_number: string
    amount: number
    currency: string
    narration: string
    reference: string
    callback_url?: string
    debit_currency?: string
  }): Promise<{
    status: string
    message: string
    data: {
      id: number
      reference: string
      status: string
    }
  }> {
    return this.request('/transfers', 'POST', data)
  }

  // ============================================
  // SUBACCOUNT METHODS
  // ============================================

  /**
   * Create a subaccount for a seller
   */
  async createSubaccount(
    subaccountData: FlutterwaveSubaccountRequest
  ): Promise<FlutterwaveSubaccountResponse> {
    return this.request<FlutterwaveSubaccountResponse>('/subaccounts', 'POST', subaccountData)
  }

  /**
   * Get subaccount details
   */
  async getSubaccount(subaccountId: string): Promise<FlutterwaveSubaccountResponse> {
    return this.request<FlutterwaveSubaccountResponse>(`/subaccounts/${subaccountId}`)
  }

  /**
   * Update subaccount
   */
  async updateSubaccount(
    subaccountId: string,
    data: Partial<FlutterwaveSubaccountRequest>
  ): Promise<FlutterwaveSubaccountResponse> {
    return this.request<FlutterwaveSubaccountResponse>(`/subaccounts/${subaccountId}`, 'PUT', data)
  }

  /**
   * Delete subaccount
   */
  async deleteSubaccount(subaccountId: string): Promise<{ status: string; message: string }> {
    return this.request(`/subaccounts/${subaccountId}`, 'DELETE')
  }

  // ============================================
  // BANK AND PAYOUT METHODS
  // ============================================

  /**
   * Get list of banks for a country
   */
  async getBanks(country: string): Promise<{
    status: string
    message: string
    data: Array<{
      id: number
      code: string
      name: string
    }>
  }> {
    return this.request(`/banks/${country}`)
  }

  /**
   * Verify account number
   */
  async verifyAccountNumber(data: {
    account_number: string
    account_bank: string
  }): Promise<{
    status: string
    message: string
    data: {
      account_number: string
      account_name: string
    }
  }> {
    return this.request('/accounts/resolve', 'POST', data)
  }

  /**
   * Get transfer fee
   */
  async getTransferFee(amount: number, currency: string): Promise<{
    status: string
    message: string
    data: {
      fee: number
    }
  }> {
    return this.request(`/transfers/fee?amount=${amount}&currency=${currency}`)
  }

  // ============================================
  // BALANCE METHODS
  // ============================================

  /**
   * Get wallet balance
   */
  async getBalance(currency: string): Promise<{
    status: string
    message: string
    data: {
      currency: string
      available_balance: number
      ledger_balance: number
    }
  }> {
    return this.request(`/balances/${currency}`)
  }
}

// Export singleton instance
export const flutterwaveClient = new FlutterwaveClient()

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique transaction reference
 */
export function generateTransactionReference(prefix: string = 'DUKA'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  signature: string,
  payload: string
): boolean {
  // Flutterwave uses a hash verification
  // In production, you'd verify this properly
  // For now, return true if signature exists
  return !!signature && signature === FLUTTERWAVE_CONFIG.webhookHash
}

/**
 * Get bank code for mobile money by provider
 */
export function getMobileMoneyBankCode(country: Country, provider?: string): string {
  const codes: Record<Country, Record<string, string>> = {
    UGANDA: {
      MTN: 'MTNUG',
      AIRTEL: 'ATLUG',
    },
    KENYA: {
      MPESA: 'MPESA',
      AIRTEL: 'AIRTELMONEYKE',
    },
    TANZANIA: {
      VODACOM: 'VODATZ',
      MPESA: 'VODATZ', // M-Pesa Tanzania is Vodacom
      AIRTEL: 'AIRTELTZ',
      TIGO: 'TIGOTZ',
      TIGO_PESA: 'TIGOTZ',
    },
    RWANDA: {
      MTN: 'MTNRW',
      AIRTEL: 'AIRTELRW',
    }
  }
  
  // If provider is specified, use it
  if (provider && codes[country]?.[provider.toUpperCase()]) {
    return codes[country][provider.toUpperCase()]
  }
  
  // Default fallbacks
  const defaults: Record<Country, string> = {
    UGANDA: 'MTNUG',
    KENYA: 'MPESA',
    TANZANIA: 'VODATZ',
    RWANDA: 'MTNRW'
  }
  return defaults[country]
}

/**
 * Create a seller subaccount (wrapper for createSubaccount)
 */
export async function createSellerSubaccount(params: {
  storeId: string
  storeName: string
  email: string
  country: string
  payoutMethod: string
  payoutPhone?: string
  bankName?: string
  bankAccount?: string
}): Promise<{ subaccount_id: string } | null> {
  try {
    const fwCountry = COUNTRY_TO_FW_COUNTRY[params.country as Country] || 'UG'
    
    // Determine bank code based on payout method
    let accountBank: string
    let accountNumber: string
    
    if (params.payoutMethod === 'MOBILE_MONEY' && params.payoutPhone) {
      accountBank = getMobileMoneyBankCode(params.country as Country)
      accountNumber = params.payoutPhone.replace(/\D/g, '')
    } else if (params.bankAccount) {
      // For bank transfers, we'd need the actual bank code
      // For now, use a placeholder - in production, seller would select their bank
      accountBank = '044' // Default placeholder
      accountNumber = params.bankAccount
    } else {
      return null
    }

    const subaccount = await flutterwaveClient.createSubaccount({
      account_bank: accountBank,
      account_number: accountNumber,
      business_name: params.storeName,
      business_email: params.email,
      business_contact: params.storeName,
      business_contact_mobile: params.payoutPhone || '',
      business_mobile: params.payoutPhone || '',
      country: fwCountry,
      split_type: 'percentage',
      split_value: 90, // Seller gets 90%, platform gets 10%
    })

    return {
      subaccount_id: String(subaccount.data.id)
    }
  } catch (error) {
    console.error('Error creating seller subaccount:', error)
    return null
  }
}
