/**
 * Security Utilities for Admin Protection
 * 
 * Provides rate limiting, IP blocking, and brute force protection
 * for the admin dashboard and login endpoints.
 * 
 * Uses database-backed storage for persistence across server restarts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Configuration
export const SECURITY_CONFIG = {
  // Maximum failed login attempts before blocking
  MAX_ATTEMPTS: 5,
  
  // Time window for counting attempts (15 minutes)
  ATTEMPT_WINDOW_MS: 15 * 60 * 1000,
  
  // Block duration after max attempts (1 hour)
  BLOCK_DURATION_MS: 60 * 60 * 1000,
  
  // Progressive delay: after each failed attempt, wait this many seconds
  PROGRESSIVE_DELAY_BASE: 2, // 2, 4, 6, 8, 10 seconds...
  
  // Max progressive delay
  MAX_DELAY: 30,
  
  // Clean up old entries every 5 minutes
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
 * Check if an IP is currently blocked (database-backed)
 */
export async function isIPBlocked(ip: string): Promise<{ blocked: boolean; reason?: string; remainingTime?: number }> {
  try {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_action: { identifier: ip, action: 'admin_login' }
      }
    })
    
    if (!entry || !entry.blockedUntil) {
      return { blocked: false }
    }
    
    const now = new Date()
    
    // Check if block has expired
    if (entry.blockedUntil < now) {
      // Clean up expired entry
      await prisma.rateLimitEntry.delete({
        where: { id: entry.id }
      }).catch(() => {})
      return { blocked: false }
    }
    
    const remainingMs = entry.blockedUntil.getTime() - now.getTime()
    const remainingMinutes = Math.ceil(remainingMs / 1000 / 60)
    
    return {
      blocked: true,
      reason: `Too many failed login attempts`,
      remainingTime: remainingMinutes
    }
  } catch (error) {
    console.error('Error checking IP block status:', error)
    // On error, don't block (fail open)
    return { blocked: false }
  }
}

/**
 * Record a failed login attempt (database-backed)
 */
export async function recordFailedAttempt(ip: string): Promise<{
  attempts: number
  blocked: boolean
  delay: number
  message: string
}> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - SECURITY_CONFIG.ATTEMPT_WINDOW_MS)
  
  try {
    // Get or create rate limit entry
    let entry = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_action: { identifier: ip, action: 'admin_login' }
      }
    })
    
    // If entry exists but window has passed, reset it
    if (entry && entry.updatedAt < windowStart) {
      await prisma.rateLimitEntry.delete({
        where: { id: entry.id }
      })
      entry = null
    }
    
    const currentAttempts = entry?.attempts || 0
    const newAttempts = currentAttempts + 1
    
    // Calculate progressive delay
    const delay = Math.min(
      SECURITY_CONFIG.PROGRESSIVE_DELAY_BASE * newAttempts,
      SECURITY_CONFIG.MAX_DELAY
    )
    
    // Update or create entry
    const blockedUntil = newAttempts >= SECURITY_CONFIG.MAX_ATTEMPTS
      ? new Date(now.getTime() + SECURITY_CONFIG.BLOCK_DURATION_MS)
      : null
    
    await prisma.rateLimitEntry.upsert({
      where: {
        identifier_action: { identifier: ip, action: 'admin_login' }
      },
      update: {
        attempts: newAttempts,
        blockedUntil
      },
      create: {
        identifier: ip,
        action: 'admin_login',
        attempts: newAttempts,
        blockedUntil
      }
    })
    
    // Log security event
    await logSecurityEvent({
      type: 'LOGIN_ATTEMPT',
      ip,
      details: `Failed login attempt #${newAttempts}`
    })
    
    // Check if should be blocked
    if (newAttempts >= SECURITY_CONFIG.MAX_ATTEMPTS) {
      return {
        attempts: newAttempts,
        blocked: true,
        delay: 0,
        message: `Account temporarily locked due to suspicious activity. Try again in ${Math.ceil(SECURITY_CONFIG.BLOCK_DURATION_MS / 1000 / 60)} minutes.`
      }
    }
    
    const remaining = SECURITY_CONFIG.MAX_ATTEMPTS - newAttempts
    
    return {
      attempts: newAttempts,
      blocked: false,
      delay,
      message: `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lockout.`
    }
  } catch (error) {
    console.error('Error recording failed attempt:', error)
    // On error, return a generic message
    return {
      attempts: 1,
      blocked: false,
      delay: 2,
      message: 'Invalid credentials. Please try again.'
    }
  }
}

/**
 * Clear failed attempts after successful login (database-backed)
 */
export async function clearFailedAttempts(ip: string): Promise<void> {
  try {
    await prisma.rateLimitEntry.deleteMany({
      where: {
        identifier: ip,
        action: 'admin_login'
      }
    })
  } catch (error) {
    console.error('Error clearing failed attempts:', error)
  }
}

/**
 * Get current attempt count for an IP
 */
export async function getAttemptCount(ip: string): Promise<number> {
  try {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_action: { identifier: ip, action: 'admin_login' }
      }
    })
    return entry?.attempts || 0
  } catch {
    return 0
  }
}

/**
 * Record suspicious activity (for non-login admin access attempts)
 */
export async function recordSuspiciousActivity(ip: string, activity: string): Promise<void> {
  try {
    // Log to security log
    await logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      details: activity
    })
    
    // Also update or create rate limit entry
    const existing = await prisma.rateLimitEntry.findUnique({
      where: {
        identifier_action: { identifier: ip, action: 'admin_access' }
      }
    })
    
    if (existing) {
      await prisma.rateLimitEntry.update({
        where: { id: existing.id },
        data: {
          attempts: existing.attempts + 1,
          blockedUntil: existing.attempts + 1 >= 3 
            ? new Date(Date.now() + SECURITY_CONFIG.BLOCK_DURATION_MS)
            : existing.blockedUntil
        }
      })
    } else {
      await prisma.rateLimitEntry.create({
        data: {
          identifier: ip,
          action: 'admin_access',
          attempts: 1
        }
      })
    }
  } catch (error) {
    console.error('Error recording suspicious activity:', error)
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
 * Log security event to database (for monitoring)
 */
export async function logSecurityEvent(event: {
  type: 'LOGIN_ATTEMPT' | 'BLOCKED_ACCESS' | 'SUSPICIOUS_ACTIVITY'
  ip: string
  details: string
  userAgent?: string
  path?: string
}): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[SECURITY] ${timestamp} | ${event.type} | IP: ${event.ip} | ${event.details}`)
  
  try {
    await prisma.securityLog.create({
      data: {
        type: event.type,
        identifier: event.ip,
        details: event.details,
        userAgent: event.userAgent,
        path: event.path
      }
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export async function cleanupExpiredEntries(): Promise<void> {
  try {
    const now = new Date()
    
    await prisma.rateLimitEntry.deleteMany({
      where: {
        OR: [
          { blockedUntil: { lt: now } },
          {
            updatedAt: { lt: new Date(now.getTime() - SECURITY_CONFIG.ATTEMPT_WINDOW_MS) },
            blockedUntil: null
          }
        ]
      }
    })
    
    // Also clean up old security logs (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    await prisma.securityLog.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } }
    })
  } catch (error) {
    console.error('Error cleaning up rate limit entries:', error)
  }
}
