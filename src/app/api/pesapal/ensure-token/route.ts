/**
 * API: Ensure Pesapal token is cached in DB
 *
 * GET /api/pesapal/ensure-token
 *
 * Minimal endpoint that ONLY authenticates with Pesapal and caches
 * the token to the database. Called silently from the checkout page
 * when the user enters step 2 (Delivery), giving it 10-30 seconds
 * to complete before they reach the Pay button.
 *
 * This is the ONLY endpoint that should call Pesapal's auth API
 * outside of the payment flow. All other endpoints read from the DB cache.
 *
 * Timeline: auth(3-5s) + DB save(100ms) = ~4-5s (fits in 10s)
 */

import { NextResponse } from 'next/server'
import { pesapalClient } from '@/lib/pesapal/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // authenticate() checks L1 (memory) → L2 (DB) → L3 (Pesapal API)
    // If token is already cached, this returns instantly from DB.
    // If not, it fetches from Pesapal and saves to DB (~4-5s).
    await pesapalClient.authenticate()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ensure-token] Failed:', error)
    // Return 200 anyway — don't block checkout if pre-warming fails.
    // The main initialize flow will still attempt auth + submitOrder.
    return NextResponse.json({ ok: false })
  }
}
