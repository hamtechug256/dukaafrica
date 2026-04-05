import { prisma } from '@/lib/db'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date | null
  retryAfterSeconds: number | null
}

/**
 * Check if a request is within rate limits.
 *
 * Uses the RateLimitEntry Prisma model for persistent rate limiting.
 * Falls back to in-memory limiting if the database is unavailable.
 *
 * @param action - Category of rate limit (e.g., 'payment', 'order', 'withdraw')
 * @param identifier - Unique identifier (user ID or IP address)
 * @param maxRequests - Maximum allowed requests in the window
 * @param windowSeconds - Time window in seconds
 * @returns RateLimitResult with allowed status and metadata
 */
export async function checkRateLimit(
  action: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const windowStart = new Date(Date.now() - windowSeconds * 1000)

    // Try database-backed rate limiting first
    const entry = await prisma.rateLimitEntry.upsert({
      where: {
        identifier_action: { identifier, action },
      },
      create: {
        identifier,
        action,
        attempts: 1,
      },
      update: {
        attempts: { increment: 1 },
      },
    })

    // If the entry was created before our window, reset it
    if (entry.createdAt < windowStart) {
      await prisma.rateLimitEntry.update({
        where: { id: entry.id },
        data: {
          attempts: 1,
          createdAt: new Date(),
          blockedUntil: null,
        },
      })

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
        retryAfterSeconds: null,
      }
    }

    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > new Date()) {
      const retryAfter = Math.ceil(
        (entry.blockedUntil.getTime() - Date.now()) / 1000
      )
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.blockedUntil,
        retryAfterSeconds: retryAfter,
      }
    }

    const remaining = Math.max(0, maxRequests - entry.attempts)

    if (entry.attempts > maxRequests) {
      // Block for the remainder of the window
      const blockUntil = new Date(Date.now() + windowSeconds * 1000)
      await prisma.rateLimitEntry.update({
        where: { id: entry.id },
        data: { blockedUntil: blockUntil },
      })

      return {
        allowed: false,
        remaining: 0,
        resetAt: blockUntil,
        retryAfterSeconds: windowSeconds,
      }
    }

    return {
      allowed: true,
      remaining,
      resetAt: new Date(
        entry.createdAt.getTime() + windowSeconds * 1000
      ),
      retryAfterSeconds: null,
    }
  } catch (error) {
    // Fallback to in-memory rate limiting if DB is unavailable
    console.error('[RATE-LIMIT] Database check failed, using in-memory fallback:', error)
    return inMemoryRateLimit(action, identifier, maxRequests, windowSeconds)
  }
}

/**
 * Reset rate limit for a specific action and identifier.
 * Useful after successful authentication or when rate limit should be cleared.
 */
export async function resetRateLimit(
  action: string,
  identifier: string
): Promise<void> {
  try {
    await prisma.rateLimitEntry.deleteMany({
      where: { identifier, action },
    })
  } catch {
    // Ignore errors - rate limit will expire naturally
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback (used when database is unavailable)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of memoryStore) {
    if (val.resetAt < now) {
      memoryStore.delete(key)
    }
  }
}, 300_000)

function inMemoryRateLimit(
  action: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  const key = `${action}:${identifier}`
  const now = Date.now()
  const entry = memoryStore.get(key)

  // No entry or expired window
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowSeconds * 1000),
      retryAfterSeconds: null,
    }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
    retryAfterSeconds: null,
  }
}

// ---------------------------------------------------------------------------
// Rate limit presets for common actions
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Payment initiation (M-Pesa, MTN, Airtel, Paystack) */
  PAYMENT_INIT: { maxRequests: 5, windowSeconds: 60 },
  /** Order creation */
  ORDER_CREATE: { maxRequests: 10, windowSeconds: 60 },
  /** Withdrawal requests */
  WITHDRAW: { maxRequests: 3, windowSeconds: 60 },
  /** Login / auth attempts */
  AUTH: { maxRequests: 10, windowSeconds: 300 },
  /** General API calls per user */
  GENERAL: { maxRequests: 60, windowSeconds: 60 },
} as const
