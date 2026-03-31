import { NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED: Use /api/cron/release-escrows instead (plural form).
 *
 * This endpoint previously had its own independent escrow release logic,
 * which conflicted with the primary cron at /api/cron/release-escrows.
 * Having two cron jobs with different logic (one using Bearer token auth
 * via CRON_SECRET, the other using query parameter secret from database)
 * could cause balance inconsistencies — one might release funds while
 * the other skips them, or both release the same funds.
 *
 * This route now simply redirects to the canonical endpoint.
 */
export async function GET(request: NextRequest) {
  const redirectUrl = new URL('/api/cron/release-escrows', request.url)

  // Forward any Bearer token from the original request
  const authHeader = request.headers.get('authorization')
  const headers: Record<string, string> = {}
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  return NextResponse.redirect(redirectUrl)
}

export async function POST(request: NextRequest) {
  return GET(request)
}
