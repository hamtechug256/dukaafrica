/**
 * API: Admin Shipping Configuration
 * 
 * GET /api/admin/shipping - Fetch all shipping tiers, rates, zone matrix
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all shipping configuration
    const [tiers, rates, zoneMatrix, settings] = await Promise.all([
      prisma.shippingTier.findMany({
        orderBy: { order: 'asc' }
      }),
      prisma.shippingRate.findMany({
        include: { ShippingTier: true }
      }),
      prisma.shippingZoneMatrix.findMany({
        orderBy: [{ originCountry: 'asc' }, { destCountry: 'asc' }]
      }),
      prisma.platformSettings.findFirst()
    ])

    return NextResponse.json({
      tiers,
      rates,
      zoneMatrix,
      settings: settings || {
        defaultCommissionRate: 10,
        shippingMarkupPercent: 5
      }
    })

  } catch (error) {
    console.error('Error fetching shipping config:', error)
    return NextResponse.json({ error: 'Failed to fetch shipping configuration' }, { status: 500 })
  }
}
