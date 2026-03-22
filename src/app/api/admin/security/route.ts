import { NextRequest, NextResponse } from 'next/server'
import {
  getClientIP,
  isIPBlocked,
  recordFailedAttempt,
  clearFailedAttempts,
  getAttemptCount,
  logSecurityEvent,
  addSecurityHeaders
} from '@/lib/security'

/**
 * GET /api/admin/security
 * Check if IP is blocked and get current attempt status
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  const blockStatus = await isIPBlocked(ip)
  const attemptCount = await getAttemptCount(ip)
  
  const response = NextResponse.json({
    blocked: blockStatus.blocked,
    reason: blockStatus.reason,
    remainingMinutes: blockStatus.remainingTime,
    attemptCount,
    ip: ip !== 'unknown' ? ip.slice(0, 3) + '***' : 'unknown' // Partially masked for privacy
  })
  
  return addSecurityHeaders(response)
}

/**
 * POST /api/admin/security
 * Record a failed login attempt
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  
  // Check if already blocked
  const blockStatus = await isIPBlocked(ip)
  if (blockStatus.blocked) {
    logSecurityEvent({
      type: 'BLOCKED_ACCESS',
      ip,
      details: 'Attempted login while blocked',
      userAgent: request.headers.get('user-agent') || undefined
    })
    
    const response = NextResponse.json({
      blocked: true,
      error: 'Your access has been temporarily restricted.',
      remainingMinutes: blockStatus.remainingTime
    }, { status: 429 })
    
    return addSecurityHeaders(response)
  }
  
  // Record the failed attempt
  const result = await recordFailedAttempt(ip)
  
  logSecurityEvent({
    type: 'LOGIN_ATTEMPT',
    ip,
    details: `Failed login attempt #${result.attempts}${result.blocked ? ' - BLOCKED' : ''}`,
    userAgent: request.headers.get('user-agent') || undefined
  })
  
  const response = NextResponse.json({
    blocked: result.blocked,
    attempts: result.attempts,
    delay: result.delay,
    message: result.message,
    remainingAttempts: 5 - result.attempts
  })
  
  return addSecurityHeaders(response)
}

/**
 * DELETE /api/admin/security
 * Clear failed attempts after successful login
 */
export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request)
  await clearFailedAttempts(ip)
  
  const response = NextResponse.json({
    success: true,
    message: 'Attempts cleared'
  })
  
  return addSecurityHeaders(response)
}
