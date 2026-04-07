/**
 * DuukaAfrica Pesapal Integration
 *
 * Handles:
 * - Payment collection via Pesapal API v3
 * - Mobile money and card payments across East Africa (KE, UG, TZ, RW)
 * - IPN (Instant Payment Notification) webhook management
 * - Order submission, status polling, refund, and cancellation
 *
 * Configuration: Reads from environment variables.
 * Pesapal uses OAuth2-style token auth (client_id + client_secret → bearer token).
 * Tokens last ~20 minutes — this client caches and reuses them.
 */

import { prisma } from '@/lib/db'

// ============================================
// PESAPAL CONFIGURATION
// ============================================

type PesapalEnv = 'sandbox' | 'production'

const PESAPAL_BASE_URLS: Record<PesapalEnv, string> = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  production: 'https://pay.pesapal.com/v3',
}

/**
 * Resolve the Pesapal environment from env vars.
 * Falls back to 'sandbox' for safety.
 */
function resolvePesapalEnv(): PesapalEnv {
  const env = process.env.NEXT_PUBLIC_PESAPAL_ENV as string | undefined
  if (env === 'production') return 'production'
  return 'sandbox'
}

/** Singleton resolved once at module load. */
const PESAPAL_ENV: PesapalEnv = resolvePesapalEnv()
const PESAPAL_BASE_URL = PESAPAL_BASE_URLS[PESAPAL_ENV]

/**
 * Get credentials from environment variables.
 *
 * NOTE: Pesapal credentials are stored in PlatformSettings (pesapalClientId,
 * pesapalClientSecret, pesapalIpnId) and read from the database. Falls back
 * to env vars: PESAPAL_CLIENT_ID, PESAPAL_CLIENT_SECRET, PESAPAL_IPN_ID
 */
async function getCredentials(): Promise<{
  clientId: string
  clientSecret: string
  ipnId: string
}> {
  // Attempt database lookup if pesapal fields exist on PlatformSettings.
  // Use a try/catch with type assertion so this degrades gracefully when
  // the columns have not yet been migrated.
  try {
    const settings = await prisma.platformSettings.findFirst()
    // Type assertion needed to access pesapal fields that may not yet exist
    // in the Prisma schema (added via future migration).
    const raw = settings as unknown as Record<string, unknown>
    if (typeof raw?.pesapalClientId === 'string' && raw.pesapalClientId) {
      return {
        clientId: raw.pesapalClientId,
        clientSecret: typeof raw.pesapalClientSecret === 'string' ? raw.pesapalClientSecret : (process.env.PESAPAL_CLIENT_SECRET || ''),
        ipnId: typeof raw.pesapalIpnId === 'string' ? raw.pesapalIpnId : (process.env.PESAPAL_IPN_ID || ''),
      }
    }
  } catch {
    // ignore — fall through to env vars
  }

  return {
    clientId: process.env.PESAPAL_CLIENT_ID || '',
    clientSecret: process.env.PESAPAL_CLIENT_SECRET || '',
    ipnId: process.env.PESAPAL_IPN_ID || '',
  }
}

// ============================================
// SIMPLE LOGGER
// ============================================

const log = {
  info: (msg: string, data?: unknown) =>
    console.log(`[Pesapal] ${msg}`, data !== undefined ? data : ''),
  warn: (msg: string, data?: unknown) =>
    console.warn(`[Pesapal] ${msg}`, data !== undefined ? data : ''),
  error: (msg: string, data?: unknown) =>
    console.error(`[Pesapal] ${msg}`, data !== undefined ? data : ''),
}

// ============================================
// TOKEN CACHE
// ============================================

interface CachedToken {
  token: string
  expiry: number // epoch ms when token expires
}

let cachedToken: CachedToken | null = null

const TOKEN_BUFFER_MS = 60_000 // request a new token 60 s before expiry

function isTokenValid(): boolean {
  return (
    cachedToken !== null && Date.now() < cachedToken.expiry - TOKEN_BUFFER_MS
  )
}

// ============================================
// TYPED ERRORS
// ============================================

export class PesapalAuthError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'PesapalAuthError'
  }
}

export class PesapalOrderError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public orderTrackingId?: string
  ) {
    super(message)
    this.name = 'PesapalOrderError'
  }
}

export class PesapalApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public responseBody?: unknown
  ) {
    super(message)
    this.name = 'PesapalApiError'
  }
}

// ============================================
// REQUEST / RESPONSE INTERFACES
// ============================================

// --- Auth ---

export interface PesapalTokenRequest {
  client_id: string
  client_secret: string
}

export interface PesapalTokenResponse {
  token: string
  expiryDate: string // ISO datetime
  errorMessage: string
  error: string | null
  status: string
}

// --- Submit Order ---

export type PesapalCurrency = 'UGX' | 'KES' | 'TZS' | 'RWF' | 'USD'

export interface PesapalOrderLineItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
  subTotal: number
}

export interface PesapalSubmitOrderRequest {
  id: string // merchant reference / order tracking id
  currency: PesapalCurrency
  amount: number
  description: string
  callback_url: string
  cancellation_url?: string
  notification_id: string // IPN ID
  billing_address: {
    email_address: string
    phone_number?: string
    first_name?: string
    last_name?: string
    country_code?: string
  }
  line_items?: PesapalOrderLineItem[]
}

export interface PesapalSubmitOrderResponse {
  order_id: string
  merchant_reference: string
  redirect_url: string
  error: string | null
  status: string
}

// --- Transaction Status ---

export interface PesapalTransactionStatusResponse {
  merchant_reference: string
  payment_method: string
  transaction_date: string
  transaction_status:
    | 'COMPLETED'
    | 'FAILED'
    | 'PENDING'
    | 'INVALID'
    | 'CANCELLED'
    | 'REVERSED'
  payment_account: string
  payment_reference: string
  amount: number
  currency: PesapalCurrency
  error: string | null
  status: string
}

// --- IPN ---

export interface PesapalRegisterIPNRequest {
  url: string
  ipn_notification_type: 'GET' | 'POST'
}

export interface PesapalIPNResponse {
  url: string
  ipn_id: string
  ipn_notification_type: 'GET' | 'POST'
  status: string
  created_date: string
  error: string | null
}

export interface PesapalIPNListResponse {
  ipn_list: Array<PesapalIPNResponse>
  status: string
  error: string | null
}

// --- Refund ---

export interface PesapalRefundRequest {
  confirmation_code: string
  amount: number
  remarks: string
}

export interface PesapalRefundResponse {
  status: string
  message: string
  refund_status: string | null
  error: string | null
}

// --- Cancel Order ---

export interface PesapalCancelOrderResponse {
  status: string
  message: string
  error: string | null
}

// ============================================
// PESAPAL API CLIENT
// ============================================

class PesapalClient {
  private readonly baseUrl: string

  constructor() {
    this.baseUrl = PESAPAL_BASE_URL
    log.info(`Client initialised — env=${PESAPAL_ENV}, baseUrl=${this.baseUrl}`)
  }

  // --------------------------------------------------
  // Low-level request helper
  // --------------------------------------------------

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown,
    requireAuth = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (requireAuth) {
      const token = await this.authenticate()
      headers['Authorization'] = `Bearer ${token}`
    }

    const options: RequestInit = { method, headers }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    log.info(`→ ${method} ${endpoint}`)

    const response = await fetch(url, options)

    let responseBody: unknown
    try {
      responseBody = await response.json()
    } catch {
      responseBody = await response.text().catch(() => null)
    }

    if (!response.ok) {
      const errMsg = extractErrorMessage(responseBody)
      log.error(
        `✗ ${method} ${endpoint} — ${response.status}`,
        responseBody
      )
      throw new PesapalApiError(
        errMsg || `Pesapal API error ${response.status}`,
        response.status,
        endpoint,
        responseBody
      )
    }

    log.info(`✓ ${method} ${endpoint}`)
    return responseBody as T
  }

  // --------------------------------------------------
  // Auth
  // --------------------------------------------------

  /**
   * Authenticate with Pesapal and return a bearer token.
   * Results are cached for up to ~19 minutes (tokens last 20 min).
   */
  async authenticate(): Promise<string> {
    if (isTokenValid() && cachedToken) {
      return cachedToken.token
    }

    const { clientId, clientSecret } = await getCredentials()

    if (!clientId || !clientSecret) {
      throw new PesapalAuthError(
        'PESAPAL_CLIENT_ID and PESAPAL_CLIENT_SECRET are required'
      )
    }

    const body: PesapalTokenRequest = {
      client_id: clientId,
      client_secret: clientSecret,
    }

    // Auth endpoint does NOT require auth header itself
    const result = await this.request<PesapalTokenResponse>(
      '/api/Auth/RequestToken',
      'POST',
      body,
      false // no auth header for token request
    )

    if (result.error || result.status !== '200') {
      throw new PesapalAuthError(
        result.errorMessage || 'Authentication failed',
        parseInt(result.status, 10) || 401
      )
    }

    // Cache token
    const expiryMs = new Date(result.expiryDate).getTime()
    cachedToken = {
      token: result.token,
      expiry: expiryMs,
    }

    const ttlSec = Math.round((expiryMs - Date.now()) / 1000)
    log.info(`Token obtained, TTL ~${ttlSec}s`)

    return result.token
  }

  /**
   * Manually invalidate cached token (useful after credential rotation).
   */
  invalidateToken(): void {
    cachedToken = null
    log.info('Token cache cleared')
  }

  // --------------------------------------------------
  // Submit Order
  // --------------------------------------------------

  /**
   * Submit a payment order to Pesapal.
   * Returns the redirect URL the buyer should be sent to.
   */
  async submitOrder(
    orderData: PesapalSubmitOrderRequest
  ): Promise<PesapalSubmitOrderResponse> {
    return this.request<PesapalSubmitOrderResponse>(
      '/api/Transactions/SubmitOrder',
      'POST',
      orderData
    )
  }

  // --------------------------------------------------
  // Transaction Status
  // --------------------------------------------------

  /**
   * Check the status of a transaction by its order tracking id.
   */
  async getTransactionStatus(
    orderTrackingId: string
  ): Promise<PesapalTransactionStatusResponse> {
    const encoded = encodeURIComponent(orderTrackingId)
    return this.request<PesapalTransactionStatusResponse>(
      `/api/Transactions/GetTransactionStatus?orderTrackingId=${encoded}`
    )
  }

  // --------------------------------------------------
  // IPN (Webhooks)
  // --------------------------------------------------

  /**
   * Register an IPN (Instant Payment Notification) URL.
   * The returned ipn_id should be stored and used when submitting orders.
   */
  async registerIPN(
    url: string,
    notificationType: 'GET' | 'POST' = 'POST'
  ): Promise<PesapalIPNResponse> {
    const body: PesapalRegisterIPNRequest = {
      url,
      ipn_notification_type: notificationType,
    }
    return this.request<PesapalIPNResponse>(
      '/api/URLSetup/RegisterIPN',
      'POST',
      body
    )
  }

  /**
   * List all registered IPN URLs.
   */
  async getIPNList(): Promise<PesapalIPNListResponse> {
    return this.request<PesapalIPNListResponse>(
      '/api/URLSetup/GetIPNList'
    )
  }

  // --------------------------------------------------
  // Refund
  // --------------------------------------------------

  /**
   * Request a refund for a confirmed (COMPLETED) transaction.
   * Requires the Pesapal confirmation_code for the transaction.
   */
  async refundOrder(
    data: PesapalRefundRequest
  ): Promise<PesapalRefundResponse> {
    return this.request<PesapalRefundResponse>(
      '/api/Transactions/RefundRequest',
      'POST',
      data
    )
  }

  // --------------------------------------------------
  // Cancel Order
  // --------------------------------------------------

  /**
   * Cancel a pending order that has not yet been paid.
   */
  async cancelOrder(
    orderTrackingId: string
  ): Promise<PesapalCancelOrderResponse> {
    // Pesapal cancel endpoint expects the tracking id in the body
    return this.request<PesapalCancelOrderResponse>(
      '/api/Transactions/CancelOrder',
      'POST',
      { orderTrackingId }
    )
  }

  // --------------------------------------------------
  // Utility / Convenience
  // --------------------------------------------------

  /** Which Pesapal environment is active. */
  get env(): PesapalEnv {
    return PESAPAL_ENV
  }

  /** The resolved base URL. */
  get baseUrlValue(): string {
    return this.baseUrl
  }
}

// Export singleton instance
export const pesapalClient = new PesapalClient()

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique transaction reference in the format DUKA_XXXXXXXX.
 * Uses a random hex suffix for uniqueness (no timestamp — avoids leakage).
 */
export function generateTransactionReference(prefix = 'DUKA'): string {
  const random = crypto
    .getRandomValues(new Uint8Array(4))
    .reduce((acc, b) => acc + b.toString(36).padStart(2, '0'), '')
    .toUpperCase()
  return `${prefix}_${random.slice(0, 8)}`
}

/**
 * Extract a human-readable error message from a Pesapal API response.
 */
function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return ''

  const obj = body as Record<string, unknown>
  if (typeof obj.errorMessage === 'string' && obj.errorMessage) {
    return obj.errorMessage
  }
  if (typeof obj.message === 'string' && obj.message) {
    return obj.message
  }
  if (typeof obj.error === 'string' && obj.error) {
    return obj.error
  }

  return ''
}

/**
 * Public config (safe for client-side).
 * Never exposes secrets.
 */
export function getPublicPesapalConfig(): {
  env: PesapalEnv
  baseUrl: string
} {
  return {
    env: PESAPAL_ENV,
    baseUrl: PESAPAL_BASE_URL,
  }
}
