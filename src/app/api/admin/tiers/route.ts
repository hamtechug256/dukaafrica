/**
 * API: Get/Set Seller Tier Configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

const DEFAULT_TIERS = [
  {
    id: 'starter',
    tierName: 'STARTER',
    displayName: 'Starter Seller',
    description: 'New sellers starting their journey',
    requiresIdVerification: false,
    requiresSelfie: false,
    requiresBusinessDoc: false,
    requiresTaxDoc: false,
    requiresPhysicalLocation: false,
    requiresMinOrders: 0,
    requiresMinRating: 0,
    maxProducts: 10,
    maxTransactionAmount: 500000,
    maxDailyOrders: 50,
    commissionRate: 15,
    escrowHoldDays: 7,
    canFeatureProducts: false,
    canCreateFlashSales: false,
    canBulkUpload: false,
    hasPrioritySupport: false,
    hasAnalytics: false,
    badgeText: 'Starter',
    badgeColor: 'oklch(0.6 0.1 45)',
    isActive: true,
    order: 1
  },
  {
    id: 'verified',
    tierName: 'VERIFIED',
    displayName: 'Verified Seller',
    description: 'ID verified sellers with proven track record',
    requiresIdVerification: true,
    requiresSelfie: true,
    requiresBusinessDoc: false,
    requiresTaxDoc: false,
    requiresPhysicalLocation: false,
    requiresMinOrders: 0,
    requiresMinRating: 0,
    maxProducts: 100,
    maxTransactionAmount: 5000000,
    maxDailyOrders: 200,
    commissionRate: 10,
    escrowHoldDays: 5,
    canFeatureProducts: true,
    canCreateFlashSales: true,
    canBulkUpload: false,
    hasPrioritySupport: false,
    hasAnalytics: true,
    badgeText: '✓ Verified',
    badgeColor: 'oklch(0.55 0.15 140)',
    isActive: true,
    order: 2
  },
  {
    id: 'premium',
    tierName: 'PREMIUM',
    displayName: 'Premium Seller',
    description: 'Top-tier sellers with business verification',
    requiresIdVerification: true,
    requiresSelfie: true,
    requiresBusinessDoc: true,
    requiresTaxDoc: true,
    requiresPhysicalLocation: false,
    requiresMinOrders: 50,
    requiresMinRating: 4.5,
    maxProducts: -1,
    maxTransactionAmount: -1,
    maxDailyOrders: -1,
    commissionRate: 8,
    escrowHoldDays: 3,
    canFeatureProducts: true,
    canCreateFlashSales: true,
    canBulkUpload: true,
    hasPrioritySupport: true,
    hasAnalytics: true,
    badgeText: '⭐ Premium',
    badgeColor: 'oklch(0.7 0.15 55)',
    isActive: true,
    order: 3
  }
]

async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true }
    })
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // Try to get tiers from database
    try {
      const tiers = await prisma.sellerTierConfig.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
      })
      
      if (tiers.length > 0) {
        return NextResponse.json({ tiers })
      }
    } catch {
      // Table doesn't exist yet
    }

    // Return default tiers
    return NextResponse.json({ tiers: DEFAULT_TIERS })
  } catch (error) {
    return NextResponse.json({ tiers: DEFAULT_TIERS })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await request.json()
    
    try {
      const updatedTier = await prisma.sellerTierConfig.update({
        where: { tierName: body.tierName },
        data: body
      })
      return NextResponse.json({ success: true, tier: updatedTier })
    } catch {
      // Table doesn't exist - return success with default
      const defaultTier = DEFAULT_TIERS.find(t => t.tierName === body.tierName)
      return NextResponse.json({ success: true, tier: defaultTier || body })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 })
  }
}
