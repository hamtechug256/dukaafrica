/**
 * API: Pre-warm Pesapal connection
 *
 * GET /api/pesapal/warm
 *
 * Pre-authenticates with Pesapal and resolves the IPN ID so that
 * when the user clicks "Pay", the initialize endpoint runs faster
 * and stays within Vercel Hobby's 10-second function timeout.
 *
 * Should be called from the client when the user reaches the payment step.
 * The Pesapal token (~20 min TTL) and IPN ID are cached in-process.
 */

import { NextResponse } from 'next/server'
import { pesapalClient, resolveIpnId } from '@/lib/pesapal/client'

export const maxDuration = 10

export async function GET() {
  try {
    // Run both in parallel: auth + IPN resolution
    const [token, ipnId] = await Promise.all([
      pesapalClient.authenticate(),
      resolveIpnId(),
    ])

    return NextResponse.json({
      success: true,
      hasToken: !!token,
      ipnId: ipnId || undefined,
    })
  } catch (error) {
    console.error('[Pesapal] Warm-up failed:', error)
    // Non-critical — the initialize endpoint will retry on its own
    return NextResponse.json({
      success: false,
      error: 'Warm-up failed',
    }, { status: 500 })
  }
}
