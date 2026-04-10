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
 * Get credentials from environment variables or PlatformSettings DB.
 *
 * Priority: PlatformSettings (DB) → env vars
 * If PESAPAL_IPN_ID is missing, auto-fetches it from Pesapal's GetIPNList API
 * by matching the registered URL against NEXT_PUBLIC_APP_URL.
 *
 * NOTE: The auto-fetched IPN ID is cached in-process so it only calls
 * Pesapal's API once per serverless function invocation.
 */
let autoFetchedIpnId: string | null = null

export async function resolveIpnId(): Promise<string> {
  // 1. Return cached auto-fetched ID if available
  if (autoFetchedIpnId) return autoFetchedIpnId

  // 2. Check env var first
  const envIpn = process.env.PESAPAL_IPN_ID
  if (envIpn) return envIpn

  // 3. Auto-fetch from Pesapal API by listing registered IPNs
  // Use the singleton pesapalClient to share token cache
  try {
    const ipnList = await pesapalClient.getIPNList()

    if (ipnList.ipn_list && ipnList.ipn_list.length > 0) {
      // Try to match by our app domain
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const domain = appUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')

      const match = ipnList.ipn_list.find(
        (ipn) =>
          ipn.url.includes(domain) ||
          ipn.url.includes('duukaafrica.com')
      )

      if (match) {
        autoFetchedIpnId = match.ipn_id
        log.info(`Auto-resolved IPN ID: ${match.ipn_id} (${match.url})`)
        return match.ipn_id
      }

      // No match found — use the first active one as fallback
      const firstActive = ipnList.ipn_list.find(
        (ipn) => ipn.status?.toLowerCase() === 'active' || ipn.status === '200'
      )
      if (firstActive) {
        autoFetchedIpnId = firstActive.ipn_id
        log.info(`Auto-resolved IPN ID (first active): ${firstActive.ipn_id} (${firstActive.url})`)
        return firstActive.ipn_id
      }

      // Last resort: use any registered IPN
      autoFetchedIpnId = ipnList.ipn_list[0].ipn_id
      log.warn(`Auto-resolved IPN ID (first available): ${autoFetchedIpnId} (${ipnList.ipn_list[0].url})`)
      return autoFetchedIpnId
    }
  } catch (err) {
    log.error('Failed to auto-fetch IPN ID from Pesapal API', err)
  }

  return ''
}

export async function getCredentials(): Promise<{
  clientId: string
  clientSecret: string
  ipnId: string
}> {
  // Attempt database lookup if pesapal fields exist on PlatformSettings.
  try {
    const settings = await prisma.platformSettings.findFirst()
    const raw = settings as unknown as Record<string, unknown>
    if (typeof raw?.pesapalClientId === 'string' && raw.pesapalClientId) {
      const dbIpnId = typeof raw.pesapalIpnId === 'string' && raw.pesapalIpnId
        ? raw.pesapalIpnId
        : ''
      return {
        clientId: raw.pesapalClientId,
        clientSecret: typeof raw.pesapalClientSecret === 'string' ? raw.pesapalClientSecret : (process.env.PESAPAL_CLIENT_SECRET || ''),
        ipnId: dbIpnId || await resolveIpnId(),
      }
    }
  } catch {
    // ignore — fall through to env vars
  }

  return {
    clientId: process.env.PESAPAL_CLIENT_ID || '',
    clientSecret: process.env.PESAPAL_CLIENT_SECRET || '',
    ipnId: await resolveIpnId(),
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
// DATABASE TOKEN CACHE (L2 — survives serverless cold starts)
// ============================================
// Pesapal tokens last ~20 min. On Vercel Hobby, each serverless invocation
// may spin up a fresh process (L1 in-memory cache is empty). The L2 DB cache
// lets us skip the slow Pesapal auth API call on almost every request.
//
// Stored in the Setting table (key-value) — no schema migration needed.

async function getCachedTokenFromDb(): Promise<CachedToken | null> {
  try {
    const [tokenRow, expiryRow] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'pesapal_access_token' } }),
      prisma.setting.findUnique({ where: { key: 'pesapal_token_expires_at' } }),
    ])
    if (!tokenRow?.value || !expiryRow?.value) return null

    const expiresAt = new Date(expiryRow.value).getTime()
    if (Date.now() >= expiresAt - TOKEN_BUFFER_MS) return null // expired

    return { token: tokenRow.value, expiry: expiresAt }
  } catch {
    return null
  }
}

async function saveTokenToDb(token: string, expiry: number): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: 'pesapal_access_token' },
        create: { key: 'pesapal_access_token', value: token, type: 'STRING' },
        update: { value: token },
      }),
      prisma.setting.upsert({
        where: { key: 'pesapal_token_expires_at' },
        create: { key: 'pesapal_token_expires_at', value: new Date(expiry).toISOString(), type: 'STRING' },
        update: { value: new Date(expiry).toISOString() },
      }),
    ])
    log.info('Token cached to DB')
  } catch (err) {
    log.warn('Failed to cache token to DB', err)
  }
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

    // Timeout: abort after 15 seconds to prevent hanging requests
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    options.signal = controller.signal

    log.info(`→ ${method} ${endpoint}`)

    const response = await fetch(url, options).finally(() => clearTimeout(timeout))

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
    // L1: In-memory cache (instant — same serverless invocation)
    if (isTokenValid() && cachedToken) {
      return cachedToken.token
    }

    // L2: Database cache (~100ms — survives serverless cold starts)
    const dbToken = await getCachedTokenFromDb()
    if (dbToken) {
      cachedToken = dbToken // populate L1 from L2
      log.info('Token loaded from DB cache')
      return dbToken.token
    }

    // L3: Pesapal API call (3-5s from Vercel — only on first call or expiry)
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

    // Cache token in both L1 (memory) and L2 (DB)
    const expiryMs = new Date(result.expiryDate).getTime()
    cachedToken = {
      token: result.token,
      expiry: expiryMs,
    }

    // Save to DB — fire-and-forget so it doesn't block the caller
    saveTokenToDb(result.token, expiryMs)

    const ttlSec = Math.round((expiryMs - Date.now()) / 1000)
    log.info(`Token obtained from Pesapal API, TTL ~${ttlSec}s`)

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
