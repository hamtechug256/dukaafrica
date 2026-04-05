/**
 * Cron Job: Auto-Tier Promotion
 *
 * Evaluates all verified active stores against tier configs and promotes
 * stores that meet the requirements (min orders, min rating).
 *
 * This endpoint can be triggered in two ways:
 * 1. By Vercel Cron Jobs or external cron service (add to vercel.json crons)
 * 2. Manually via POST (e.g., curl with Bearer token)
 *
 * Vercel Cron configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/auto-tier",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 *
 * Note: Auto-tier evaluation also runs on-demand after escrow release,
 * so this cron serves as a safety net for edge cases (e.g., DB restores,
 * manual data fixes, missed real-time evaluations).
 */

import { NextRequest, NextResponse } from 'next/server'
import { evaluateAndPromoteStores } from '@/lib/auto-tier'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[CRON:AUTO-TIER] CRON_SECRET not configured - endpoint blocked')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON:AUTO-TIER] Starting auto-tier evaluation job...')

    const result = await evaluateAndPromoteStores()

    console.log(
      `[CRON:AUTO-TIER] Job complete: ${result.evaluated} evaluated, ${result.promoted} promoted`
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    console.error('[CRON:AUTO-TIER] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Auto-tier cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export const POST = GET
