/**
 * ONE-TIME DEBUG ENDPOINT
 * POST /api/debug/clear-pesapal-creds
 *
 * Clears pesapalClientId and pesapalClientSecret from PlatformSettings
 * so the code falls back to Vercel env vars (PESAPAL_CLIENT_ID, PESAPAL_CLIENT_SECRET).
 *
 * SECURITY: Only SUPER_ADMIN can call this. DELETE THIS FILE after use.
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check super admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Clear credentials from DB so env vars take over
    const result = await prisma.platformSettings.updateMany({
      data: {
        pesapalClientId: null,
        pesapalClientSecret: null,
      },
    })

    return NextResponse.json({
      ok: true,
      message: `Cleared pesapal credentials from ${result.count} PlatformSettings row(s). Env vars (PESAPAL_CLIENT_ID, PESAPAL_CLIENT_SECRET) will now be used.`,
      clearedRows: result.count,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
