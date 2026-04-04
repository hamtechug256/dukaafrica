/**
 * API: Public Homepage Settings
 * 
 * GET /api/homepage/settings
 * Returns all admin-configurable homepage content in a structured object.
 * Cached for 5 minutes server-side via React Query on the client.
 */
import { NextResponse } from 'next/server'
import { getAllPublicSettings } from '@/lib/site-settings'

export async function GET() {
  try {
    const settings = await getAllPublicSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error fetching homepage settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 },
    )
  }
}
