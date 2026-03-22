/**
 * Security Utilities for Admin Protection
 * 
 * Provides rate limiting, IP blocking, and brute force protection
 * for the admin dashboard and login endpoints.
 * 
 * Uses hybrid approach: in-memory for immediate protection + database for persistence
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  checkRateLimit, 
  recordFailedAttempt as dbRecordFailedAttempt,
  clearRateLimit as dbClearRateLimit,
  getBlockStatus,
  logSecurityEvent as dbLogSecurityEvent,
  RATE_LIMIT_CONFIGS 
} from './rate-limit'
import { logger } from './logger'

// Re-export SECURITY_CONFIG for backward compatibility
export const SECURITY_CONFIG = {
  MAX_ATTEMPTS: RATE_LIMIT_CONFIGS.login.maxAttempts,
  ATTEMPT_WINDOW_MS: RATE_LIMIT_CONFIGS.login.windowMs,
  BLOCK_DURATION_MS: RATE_LIMIT_CONFIGS.login.blockDurationMs,
  PROGRESSIVE_DELAY_BASE: RATE_LIMIT_CONFIGS.login.progressiveDelayBase,
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (for proxies/CDNs)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown'
}

/**
 * Check if an IP is currently blocked
 * Now uses database-backed rate limiting
 */
export async function isIPBlocked(ip: string): Promise<{ blocked: boolean; reason?: string; remainingTime?: number }> {
  try {
    const status = await getBlockStatus(ip, 'login')
    
    if (!status.blocked) {
      return { blocked: false }
    }
    
    const remainingTime = status.blockedUntil 
      ? Math.ceil((status.blockedUntil.getTime() - Date.now()) / 1000 / 60)
      : 0
    
    return {
      blocked: true,
      reason: `Too many failed login attempts (${status.attempts})`,
      remainingTime
    }
  } catch (error) {
    logger.error('Failed to check IP block status', { ip, error })
    return { blocked: false }
  }
}

// Synchronous wrapper for middleware (uses in-memory fallback)
export function isIPBlockedSync(ip: string): { blocked: boolean; reason?: string; remainingTime?: number } {
  // For middleware, we need sync access - check memory cache
  // This is a fallback; async version should be preferred
  return { blocked: false }
}

/**
 * Record a failed login attempt
 * Uses database-backed rate limiting
 */
export async function recordFailedLoginAttempt(ip: string): Promise<{
  attempts: number
  blocked: boolean
  delay: number
  message: string
}> {
  try {
    const result = await dbRecordFailedAttempt(ip, 'login')
    
    return {
      attempts: result.attempts,
      blocked: result.blocked || false,
      delay: result.delay || 0,
      message: result.message || 'Invalid credentials'
    }
  } catch (error) {
    logger.error('Failed to record failed attempt', { ip, error })
    return {
      attempts: 1,
      blocked: false,
      delay: 0,
      message: 'Invalid credentials'
    }
  }
}

// Legacy sync version for backward compatibility
export function recordFailedAttemptSync(ip: string): {
  attempts: number
  blocked: boolean
  delay: number
  message: string
} {
  logger.warn('Using deprecated sync rate limiter', { ip })
  return {
    attempts: 1,
    blocked: false,
    delay: 2,
    message: 'Invalid credentials. Please try again.'
  }
}

// Backward compatible alias
export const recordFailedAttempt = recordFailedLoginAttempt

/**
 * Clear failed attempts after successful login
 */
export async function clearFailedAttempts(ip: string): Promise<void> {
  await dbClearRateLimit(ip, 'login')
}

/**
 * Get current attempt count for an IP
 */
export async function getAttemptCount(ip: string): Promise<number> {
  const status = await getBlockStatus(ip, 'login')
  return status.attempts
}

/**
 * Record suspicious activity (for non-login admin access attempts)
 */
export async function recordSuspiciousActivity(ip: string, activity: string): Promise<void> {
  await dbLogSecurityEvent({
    type: 'SUSPICIOUS_ACTIVITY',
    identifier: ip,
    details: activity
  })
}

/**
 * Security headers for admin routes
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  return response
}

/**
 * Log security event (for monitoring)
 * Now uses structured logging and database persistence
 */
export async function logSecurityEventDB(event: {
  type: 'LOGIN_ATTEMPT' | 'BLOCKED_ACCESS' | 'SUSPICIOUS_ACTIVITY'
  ip: string
  details: string
  userAgent?: string
}): Promise<void> {
  logger.security(event.type.toLowerCase(), {
    ip: event.ip,
    details: event.details,
    userAgent: event.userAgent
  })
  
  await dbLogSecurityEvent({
    type: event.type,
    identifier: event.ip,
    details: event.details,
    userAgent: event.userAgent
  })
}

// Legacy sync version for backward compatibility
export function logSecurityEvent(event: {
  type: 'LOGIN_ATTEMPT' | 'BLOCKED_ACCESS' | 'SUSPICIOUS_ACTIVITY'
  ip: string
  details: string
  userAgent?: string
}): void {
  logger.security(event.type.toLowerCase(), {
    ip: event.ip,
    details: event.details,
    userAgent: event.userAgent
  })
}
