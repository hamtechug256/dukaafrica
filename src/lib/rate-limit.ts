/**
 * Database-Backed Rate Limiting for Production
 * 
 * Hybrid approach:
 * - In-memory cache for immediate protection (fast)
 * - Database persistence for cross-instance protection
 * - Automatic cleanup of expired entries
 * 
 * This solves the "in-memory resets on restart" issue from the audit.
 */

import { prisma } from '@/lib/db'
import { logger } from './logger'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
  progressiveDelayBase: number
}

interface RateLimitResult {
  allowed: boolean
  attempts: number
  remaining: number
  delay?: number
  blocked?: boolean
  blockedUntil?: Date
  message?: string
}

// In-memory cache for fast lookups (synced with DB)
const memoryCache = new Map<string, { 
  attempts: number
  blockedUntil: Date | null
  lastSync: number 
}>()

// Default configurations for different actions
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    progressiveDelayBase: 2,
  },
  password_reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
    progressiveDelayBase: 5,
  },
  api_call: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
    progressiveDelayBase: 1,
  },
  otp_verify: {
    maxAttempts: 5,
    windowMs: 30 * 60 * 1000, // 30 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    progressiveDelayBase: 3,
  },
}

// Sync interval (5 minutes)
const SYNC_INTERVAL_MS = 5 * 60 * 1000
const CACHE_TTL_MS = 60 * 1000 // Cache entries valid for 1 minute

/**
 * Get a unique key for rate limiting
 */
function getKey(identifier: string, action: string): string {
  return `${action}:${identifier}`
}

/**
 * Sync in-memory cache with database
 */
async function syncWithDatabase(identifier: string, action: string): Promise<{
  attempts: number
  blockedUntil: Date | null
}> {
  try {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_action: { identifier, action }
      }
    })

    if (!entry) {
      return { attempts: 0, blockedUntil: null }
    }

    // Check if block has expired
    if (entry.blockedUntil && entry.blockedUntil < new Date()) {
      // Clear expired entry
      await prisma.rateLimitEntry.delete({
        where: { id: entry.id }
      })
      return { attempts: 0, blockedUntil: null }
    }

    return { 
      attempts: entry.attempts, 
      blockedUntil: entry.blockedUntil 
    }
  } catch (error) {
    logger.error('Failed to sync rate limit with database', { identifier, action, error })
    // Return cached value if available, else default
    const key = getKey(identifier, action)
    const cached = memoryCache.get(key)
    return cached ? { attempts: cached.attempts, blockedUntil: cached.blockedUntil } : { attempts: 0, blockedUntil: null }
  }
}

/**
 * Check if an action is rate limited
 */
export async function checkRateLimit(
  identifier: string, 
  action: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS.api_call
): Promise<RateLimitResult> {
  const key = getKey(identifier, action)
  const now = new Date()
  
  // Check memory cache first (fast path)
  const cached = memoryCache.get(key)
  const isCacheValid = cached && (now.getTime() - cached.lastSync) < CACHE_TTL_MS
  
  let attempts: number
  let blockedUntil: Date | null

  if (isCacheValid) {
    attempts = cached.attempts
    blockedUntil = cached.blockedUntil
  } else {
    // Sync with database
    const dbState = await syncWithDatabase(identifier, action)
    attempts = dbState.attempts
    blockedUntil = dbState.blockedUntil
  }

  // Check if currently blocked
  if (blockedUntil && blockedUntil > now) {
    const remainingMs = blockedUntil.getTime() - now.getTime()
    return {
      allowed: false,
      attempts,
      remaining: 0,
      blocked: true,
      blockedUntil,
      message: `Too many attempts. Please try again in ${Math.ceil(remainingMs / 60000)} minutes.`
    }
  }

  const remaining = Math.max(0, config.maxAttempts - attempts)
  
  return {
    allowed: attempts < config.maxAttempts,
    attempts,
    remaining,
    blocked: false,
  }
}

/**
 * Record a failed attempt (increment counter)
 */
export async function recordFailedAttempt(
  identifier: string,
  action: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS.api_call
): Promise<RateLimitResult> {
  const key = getKey(identifier, action)
  const now = new Date()
  
  try {
    // Upsert the rate limit entry
    const entry = await prisma.rateLimitEntry.upsert({
      where: {
        identifier_action: { identifier, action }
      },
      create: {
        identifier,
        action,
        attempts: 1,
      },
      update: {
        attempts: { increment: 1 },
        updatedAt: now,
      }
    })

    const attempts = entry.attempts
    let blockedUntil: Date | null = null

    // Check if should be blocked
    if (attempts >= config.maxAttempts) {
      blockedUntil = new Date(now.getTime() + config.blockDurationMs)
      
      await prisma.rateLimitEntry.update({
        where: { id: entry.id },
        data: { blockedUntil }
      })

      // Log security event
      await logSecurityEvent({
        type: 'RATE_LIMIT_BLOCKED',
        identifier,
        action,
        attempts,
        blockedUntil: blockedUntil.toISOString(),
      })

      // Update memory cache
      memoryCache.set(key, { attempts, blockedUntil, lastSync: now.getTime() })

      return {
        allowed: false,
        attempts,
        remaining: 0,
        blocked: true,
        blockedUntil,
        message: `Too many attempts. Account temporarily locked for ${Math.ceil(config.blockDurationMs / 60000)} minutes.`
      }
    }

    const delay = Math.min(config.progressiveDelayBase * attempts, 30)
    const remaining = config.maxAttempts - attempts

    // Update memory cache
    memoryCache.set(key, { attempts, blockedUntil, lastSync: now.getTime() })

    return {
      allowed: true,
      attempts,
      remaining,
      delay,
      message: `Attempt ${attempts}/${config.maxAttempts}. ${remaining} attempts remaining.`
    }
  } catch (error) {
    logger.error('Failed to record rate limit attempt', { identifier, action, error })
    
    // Fallback: allow the request but log the error
    return {
      allowed: true,
      attempts: 0,
      remaining: config.maxAttempts,
      message: 'Rate limiting temporarily unavailable.'
    }
  }
}

/**
 * Clear rate limit after successful action (e.g., successful login)
 */
export async function clearRateLimit(identifier: string, action: string): Promise<void> {
  const key = getKey(identifier, action)
  
  try {
    await prisma.rateLimitEntry.deleteMany({
      where: { identifier, action }
    })
  } catch (error) {
    logger.error('Failed to clear rate limit', { identifier, action, error })
  }
  
  // Clear memory cache
  memoryCache.delete(key)
}

/**
 * Log a security event to the database
 */
export async function logSecurityEvent(event: {
  type: string
  identifier: string
  action?: string
  details?: string
  userAgent?: string
  path?: string
  attempts?: number
  blockedUntil?: string
}): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        type: event.type,
        identifier: event.identifier,
        details: JSON.stringify({
          action: event.action,
          attempts: event.attempts,
          blockedUntil: event.blockedUntil,
        }),
        userAgent: event.userAgent,
        path: event.path,
      }
    })
  } catch (error) {
    logger.error('Failed to log security event', { event, error })
  }
}

/**
 * Get current block status for an identifier
 */
export async function getBlockStatus(
  identifier: string,
  action: string
): Promise<{ blocked: boolean; blockedUntil?: Date; attempts: number }> {
  const result = await checkRateLimit(identifier, action)
  
  return {
    blocked: result.blocked || false,
    blockedUntil: result.blockedUntil,
    attempts: result.attempts
  }
}

/**
 * Clean up expired entries (can be called periodically or via cron job)
 */
export async function cleanupExpiredEntries(): Promise<number> {
  try {
    const result = await prisma.rateLimitEntry.deleteMany({
      where: {
        blockedUntil: { lt: new Date() }
      }
    })
    
    // Also clean up old security logs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await prisma.securityLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo }
      }
    })
    
    // Clear memory cache
    memoryCache.clear()
    
    logger.info('Rate limit cleanup completed', { deleted: result.count })
    return result.count
  } catch (error) {
    logger.error('Failed to cleanup expired rate limit entries', { error })
    return 0
  }
}

// Re-export for backward compatibility
export { RATE_LIMIT_CONFIGS as SECURITY_CONFIG }
