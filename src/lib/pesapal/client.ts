/**
 * DuukaAfrica Pesapal Integration
 *
 * Handles:
 * - Payment collection via Pesapal API v3
 * - Mobile money and card payments across East Africa (KE, UG, TZ, RW)
 * - IPN (Instant Payment Notification) webhook management
 * - Order submission, status polling, refund, and cancellation
 *
 * Configuration: Reads from PlatformSettings DB first, then env vars.
 * Pesapal uses OAuth2-style token auth (client_id + client_secret → bearer token).
 * Tokens last ~20 minutes — this client caches and reuses them.
 */

import { prisma } from '@/lib/db'

// ============================================
// PESAPAL CONFIGURATION
// ============================================

// Track token refresh in-progress to prevent concurrent L3 calls within same invocation
let tokenRefreshPromise: Promise<string> | null = null

type PesapalEnv = 'sandbox' | 'production'

const PESAPAL_BASE_URLS: Record<PesapalEnv, string> = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  production: 'https://pay.pesapal.com/v3',
}

/** Fallback env from env var — used if DB is unreachable. */
const PESAPAL_ENV_FALLBACK: PesapalEnv =
  (process.env.NEXT_PUBLIC_PESAPAL_ENV === 'production' ? 'production' : 'sandbox')

/**
 * Cached Pesapal configuration resolved from DB.
 * Populated once per serverless invocation on first authenticate() call.
 * This avoids multiple DB queries — env, clientId, clientSecret all read in one query.
 */
interface ResolvedConfig {
  env: PesapalEnv
  clientId: string
  clientSecret: string
  source: string // 'DB PlatformSettings' | 'env vars'
}

let resolvedConfig: ResolvedConfig | null = null

/**
 * Read Pesapal config from DB (PlatformSettings) in a SINGLE query.
 * Falls back to env vars if DB has no credentials.
 *
 * Returns: { env, clientId, clientSecret, source }
 */
async function resolveConfig(): Promise<ResolvedConfig> {
  if (resolvedConfig) return resolvedConfig

  try {
    const settings = await prisma.platformSettings.findFirst({
      select: {
        pesapalClientId: true,
        pesapalClientSecret: true,
        pesapalEnvironment: true,
      },
    })

    const clientId = (settings?.pesapalClientId || '').trim()
    const clientSecret = (settings?.pesapalClientSecret || '').trim()
    const dbEnv = settings?.pesapalEnvironment?.trim()

    // Use DB credentials if both are present
    if (clientId && clientSecret) {
      const env: PesapalEnv = (dbEnv === 'production' || dbEnv === 'sandbox')
        ? dbEnv
        : PESAPAL_ENV_FALLBACK

      resolvedConfig = { env, clientId, clientSecret, source: 'DB PlatformSettings' }
      log.info(`Config resolved from DB: env=${env}, clientId=${clientId.slice(0, 8)}...`)
      return resolvedConfig
    }

    // DB has env but no creds — use DB env, fall back to env var creds
    if (dbEnv === 'production' || dbEnv === 'sandbox') {
      const envClientId = (process.env.PESAPAL_CLIENT_ID || '').trim()
      const envClientSecret = (process.env.PESAPAL_CLIENT_SECRET || '').trim()
      resolvedConfig = {
        env: dbEnv,
        clientId: envClientId,
        clientSecret: envClientSecret,
        source: `env vars (env from DB: ${dbEnv})`,
      }
      log.info(`Config: env=${dbEnv} from DB, creds from env vars`)
      return resolvedConfig
    }
  } catch {
    // DB read failed — fall through to env vars
  }

  // Fallback: everything from env vars
  const envClientId = (process.env.PESAPAL_CLIENT_ID || '').trim()
  const envClientSecret = (process.env.PESAPAL_CLIENT_SECRET || '').trim()
  resolvedConfig = {
    env: PESAPAL_ENV_FALLBACK,
    clientId: envClientId,
    clientSecret: envClientSecret,
    source: 'env vars',
  }
  log.info(`Config: everything from env vars, env=${PESAPAL_ENV_FALLBACK}`)
  return resolvedConfig
}

// ============================================
// DATABASE IPN CACHE (L2 — survives serverless cold starts)
// ============================================

async function getCachedIpnFromDb(): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'pesapal_ipn_id' } })
    return row?.value || null
  } catch {
    return null
  }
}

async function saveIpnToDb(ipnId: string): Promise<void> {
  try {
    await prisma.setting.upsert({
      where: { key: 'pesapal_ipn_id' },
      create: { key: 'pesapal_ipn_id', value: ipnId, type: 'STRING' },
      update: { value: ipnId },
    })
    log.info('IPN ID cached to DB Setting table')
  } catch (err) {
    log.warn('Failed to cache IPN ID to DB', err)
  }
}

/**
 * Get IPN ID from the fastest available source.
 * Used by the initialize route — NEVER calls Pesapal API.
 *
 * Priority: env var → DB Setting table → DB PlatformSettings → empty string
 */
export async function getIpnIdFast(): Promise<string> {
  // 1. Environment variable (instant)
  const envIpn = (process.env.PESAPAL_IPN_ID || '').trim()
  if (envIpn) return envIpn

  // 2. DB Setting table (fast, ~50ms)
  const settingIpn = await getCachedIpnFromDb()
  if (settingIpn) return settingIpn

  // 3. PlatformSettings table (admin config, ~100ms)
  try {
    const settings = await prisma.platformSettings.findFirst({
      select: { pesapalIpnId: true },
    })
    if (settings?.pesapalIpnId) return settings.pesapalIpnId
  } catch {
    // ignore
  }

  // 4. No IPN found — proceed with empty string
  return ''
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
  constructor(message: string, public statusCode?: number, public pesapalResponse?: unknown) {
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
  id: string
  currency: PesapalCurrency
  amount: number
  description: string
  callback_url: string
  cancellation_url?: string
  notification_id: string
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
  constructor() {
    log.info(`Client initialised — fallback env=${PESAPAL_ENV_FALLBACK}`)
  }

  // --------------------------------------------------
  // Low-level request helper
  // --------------------------------------------------

  /**
   * Make a request to the Pesapal API.
   * Uses cached config (env + base URL) from resolveConfig().
   * No extra DB queries on the hot path.
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown,
    requireAuth = true
  ): Promise<T> {
    // Use cached config — resolved once per invocation, no DB query here
    const config = await resolveConfig()
    const baseUrl = PESAPAL_BASE_URLS[config.env]
    const url = `${baseUrl}${endpoint}`

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

    // Timeout: abort after 8 seconds — fail fast
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    options.signal = controller.signal

    log.info(`→ ${method} ${endpoint} (${config.env})`)

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
   *
   * Flow: L1 memory → L2 DB → L3 Pesapal API
   * Config (env + creds) resolved from ONE DB query, cached in memory.
   */
  async authenticate(): Promise<string> {
    // L1: In-memory cache (instant — same serverless invocation)
    if (isTokenValid() && cachedToken) {
      return cachedToken.token
    }

    // Deduplicate: if a token refresh is already in progress, wait for it
    if (tokenRefreshPromise) {
      log.info('Waiting for in-progress token refresh')
      return tokenRefreshPromise
    }

    // L2: Database cache (~100ms) → L3: Pesapal API (3-5s)
    tokenRefreshPromise = (async () => {
      try {
        // Check DB for cached token
        const dbToken = await getCachedTokenFromDb()
        if (dbToken) {
          cachedToken = dbToken // populate L1 from L2
          log.info('Token loaded from DB cache')
          return dbToken.token
        }

        // Resolve config (env + creds) from ONE DB query, cached in memory
        const config = await resolveConfig()

        log.info(`Auth: L1/L2 miss → Pesapal API (env=${config.env}, creds from: ${config.source}, clientId: ${config.clientId ? config.clientId.slice(0, 8) + '...' : 'EMPTY'})`)

        if (!config.clientId || !config.clientSecret) {
          throw new PesapalAuthError(
            'PESAPAL_CLIENT_ID and PESAPAL_CLIENT_SECRET are required. Set them in Vercel env vars or the admin panel.'
          )
        }

        // Call Pesapal auth API
        const body: PesapalTokenRequest = {
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }

        // Auth endpoint does NOT require auth header itself
        const result = await this.request<PesapalTokenResponse>(
          '/api/Auth/RequestToken',
          'POST',
          body,
          false
        )

        if (result.error || result.status !== '200') {
          // Log the FULL Pesapal response for debugging
          log.error('Pesapal auth rejected:', JSON.stringify(result))
          throw new PesapalAuthError(
            result.errorMessage || result.error || 'Authentication failed',
            parseInt(result.status, 10) || 401,
            result // attach full response for diagnostics
          )
        }

        // Cache token in both L1 (memory) and L2 (DB)
        const expiryMs = new Date(result.expiryDate).getTime()
        cachedToken = { token: result.token, expiry: expiryMs }

        // MUST await — fire-and-forget loses the token on Vercel timeout
        await saveTokenToDb(result.token, expiryMs)

        const ttlSec = Math.round((expiryMs - Date.now()) / 1000)
        log.info(`Token obtained from Pesapal API (${config.env}), TTL ~${ttlSec}s`)

        return result.token
      } finally {
        tokenRefreshPromise = null
      }
    })()

    return tokenRefreshPromise
  }

  /**
   * Manually invalidate cached token (useful after credential rotation).
   */
  invalidateToken(): void {
    cachedToken = null
    resolvedConfig = null // also clear config cache
    log.info('Token + config cache cleared')
  }

  // --------------------------------------------------
  // Submit Order
  // --------------------------------------------------

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

  async registerIPN(
    url: string,
    notificationType: 'GET' | 'POST' = 'POST'
  ): Promise<PesapalIPNResponse> {
    return this.request<PesapalIPNResponse>(
      '/api/URLSetup/RegisterIPN',
      'POST',
      { url, ipn_notification_type: notificationType }
    )
  }

  async getIPNList(): Promise<PesapalIPNListResponse> {
    return this.request<PesapalIPNListResponse>(
      '/api/URLSetup/GetIPNList'
    )
  }

  // --------------------------------------------------
  // Refund
  // --------------------------------------------------

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

  async cancelOrder(
    orderTrackingId: string
  ): Promise<PesapalCancelOrderResponse> {
    return this.request<PesapalCancelOrderResponse>(
      '/api/Transactions/CancelOrder',
      'POST',
      { orderTrackingId }
    )
  }

  // --------------------------------------------------
  // Utility
  // --------------------------------------------------

  get env(): PesapalEnv {
    return PESAPAL_ENV_FALLBACK
  }

  get baseUrlValue(): string {
    return PESAPAL_BASE_URLS[PESAPAL_ENV_FALLBACK]
  }
}

// Export singleton instance
export const pesapalClient = new PesapalClient()
export { saveIpnToDb }

// ============================================
// HELPER FUNCTIONS
// ============================================

export function generateTransactionReference(prefix = 'DUKA'): string {
  const random = crypto
    .getRandomValues(new Uint8Array(4))
    .reduce((acc, b) => acc + b.toString(36).padStart(2, '0'), '')
    .toUpperCase()
  return `${prefix}_${random.slice(0, 8)}`
}

function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return ''

  const obj = body as Record<string, unknown>
  if (typeof obj.errorMessage === 'string' && obj.errorMessage) {
    return obj.errorMessage
  }
  if (obj.error && typeof obj.error === 'object') {
    const nested = obj.error as Record<string, unknown>
    if (typeof nested.message === 'string' && nested.message) {
      return nested.message
    }
    if (typeof obj.error === 'string') return obj.error
  }
  if (typeof obj.message === 'string' && obj.message) {
    return obj.message
  }

  return ''
}

export function getPublicPesapalConfig(): {
  env: PesapalEnv
  baseUrl: string
} {
  return {
    env: PESAPAL_ENV_FALLBACK,
    baseUrl: PESAPAL_BASE_URLS[PESAPAL_ENV_FALLBACK],
  }
}
