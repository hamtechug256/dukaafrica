/**
 * Security Utilities for Admin Protection
 * 
 * Provides rate limiting, IP blocking, and brute force protection
 * for the admin dashboard and login endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting (resets on server restart)
// For production, use Redis or a database
const loginAttempts = new Map<string, { count: number; firstAttempt: number; blockedUntil: number }>()

// Configuration
const SECURITY_CONFIG = {
  // Maximum failed login attempts before blocking
  MAX_ATTEMPTS: 5,
  
  // Time window for counting attempts (15 minutes)
  ATTEMPT_WINDOW_MS: 15 * 60 * 1000,
  
  // Block duration after max attempts (1 hour)
  BLOCK_DURATION_MS: 60 * 60 * 1000,
  
  // Progressive delay: after each failed attempt, wait this many seconds
  PROGRESSIVE_DELAY_BASE: 2, // 2, 4, 6, 8, 10 seconds...
  
  // Clean up old entries every 5 minutes
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
}

// Track blocked IPs that tried to access admin routes
const blockedIPs = new Map<string, { reason: string; timestamp: number; attempts: number }>()

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
 */
export function isIPBlocked(ip: string): { blocked: boolean; reason?: string; remainingTime?: number } {
  const entry = blockedIPs.get(ip)
  
  if (!entry) {
    return { blocked: false }
  }
  
  const now = Date.now()
  
  // Check if block has expired
  if (now - entry.timestamp > SECURITY_CONFIG.BLOCK_DURATION_MS) {
    blockedIPs.delete(ip)
    loginAttempts.delete(ip)
    return { blocked: false }
  }
  
  const remainingTime = SECURITY_CONFIG.BLOCK_DURATION_MS - (now - entry.timestamp)
  
  return {
    blocked: true,
    reason: entry.reason,
    remainingTime: Math.ceil(remainingTime / 1000 / 60) // minutes
  }
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(ip: string): {
  attempts: number
  blocked: boolean
  delay: number
  message: string
} {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  
  // Clean up old entries
  if (entry && now - entry.firstAttempt > SECURITY_CONFIG.ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(ip)
  }
  
  const current = loginAttempts.get(ip) || { count: 0, firstAttempt: now, blockedUntil: 0 }
  const newCount = current.count + 1
  
  // Calculate progressive delay
  const delay = Math.min(
    SECURITY_CONFIG.PROGRESSIVE_DELAY_BASE * newCount,
    30 // Max 30 seconds
  )
  
  loginAttempts.set(ip, {
    count: newCount,
    firstAttempt: current.firstAttempt || now,
    blockedUntil: current.blockedUntil
  })
  
  // Check if should be blocked
  if (newCount >= SECURITY_CONFIG.MAX_ATTEMPTS) {
    blockedIPs.set(ip, {
      reason: `Too many failed login attempts (${newCount})`,
      timestamp: now,
      attempts: newCount
    })
    
    loginAttempts.set(ip, {
      ...loginAttempts.get(ip)!,
      blockedUntil: now + SECURITY_CONFIG.BLOCK_DURATION_MS
    })
    
    return {
      attempts: newCount,
      blocked: true,
      delay: 0,
      message: `Account temporarily locked due to suspicious activity. Try again in ${Math.ceil(SECURITY_CONFIG.BLOCK_DURATION_MS / 1000 / 60)} minutes.`
    }
  }
  
  const remaining = SECURITY_CONFIG.MAX_ATTEMPTS - newCount
  
  return {
    attempts: newCount,
    blocked: false,
    delay,
    message: `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lockout.`
  }
}

/**
 * Clear failed attempts after successful login
 */
export function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip)
  // Don't remove from blockedIPs - let the block expire naturally
}

/**
 * Get current attempt count for an IP
 */
export function getAttemptCount(ip: string): number {
  return loginAttempts.get(ip)?.count || 0
}

/**
 * Record suspicious activity (for non-login admin access attempts)
 */
export function recordSuspiciousActivity(ip: string, activity: string): void {
  const current = blockedIPs.get(ip)
  
  if (current) {
    blockedIPs.set(ip, {
      ...current,
      attempts: current.attempts + 1,
      reason: `${current.reason}; ${activity}`
    })
  } else {
    blockedIPs.set(ip, {
      reason: activity,
      timestamp: Date.now(),
      attempts: 1
    })
  }
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
 */
export function logSecurityEvent(event: {
  type: 'LOGIN_ATTEMPT' | 'BLOCKED_ACCESS' | 'SUSPICIOUS_ACTIVITY'
  ip: string
  details: string
  userAgent?: string
}): void {
  const timestamp = new Date().toISOString()
  console.log(`[SECURITY] ${timestamp} | ${event.type} | IP: ${event.ip} | ${event.details}`)
  
  // In production, you'd want to send this to a logging service
  // or store in a database for audit trails
}

// Periodic cleanup of old entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    
    for (const [ip, entry] of loginAttempts.entries()) {
      if (now - entry.firstAttempt > SECURITY_CONFIG.ATTEMPT_WINDOW_MS) {
        loginAttempts.delete(ip)
      }
    }
    
    for (const [ip, entry] of blockedIPs.entries()) {
      if (now - entry.timestamp > SECURITY_CONFIG.BLOCK_DURATION_MS) {
        blockedIPs.delete(ip)
      }
    }
  }, SECURITY_CONFIG.CLEANUP_INTERVAL_MS)
}

export { SECURITY_CONFIG }
