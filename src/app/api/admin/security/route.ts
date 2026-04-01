import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
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
 * PUBLIC endpoint - used during login flow before authentication
 */
export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Security check error:', error)
    return NextResponse.json({ error: 'Security check failed' }, { status: 500 })
  }
}

/**
 * POST /api/admin/security
 * Record a failed login attempt
 * PUBLIC endpoint - used during login flow before authentication
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)

    // Check if already blocked
    const blockStatus = await isIPBlocked(ip)
    if (blockStatus.blocked) {
      await logSecurityEvent({
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

    await logSecurityEvent({
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
  } catch (error) {
    console.error('Failed login record error:', error)
    return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/security
 * Clear failed attempts after successful login
 * REQUIRES AUTHENTICATION - only authenticated users can clear their attempts
 * This prevents attackers from bypassing rate limiting by clearing their own attempts
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication - only allow after successful login
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const ip = getClientIP(request)
    await clearFailedAttempts(ip)

    await logSecurityEvent({
      type: 'LOGIN_ATTEMPT',
      ip,
      details: 'Attempts cleared after successful login',
      userAgent: request.headers.get('user-agent') || undefined
    })

    const response = NextResponse.json({
      success: true,
      message: 'Attempts cleared'
    })

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Clear attempts error:', error)
    return NextResponse.json({ error: 'Failed to clear attempts' }, { status: 500 })
  }
}
