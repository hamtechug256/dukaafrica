/**
 * API: Public Seller Tier Configurations
 *
 * GET /api/tiers
 *
 * Returns all active seller tier configurations (public, no auth required).
 * Used by the seller fees page to display dynamic pricing tiers.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

const DEFAULT_TIERS = [
  {
    tierName: 'STARTER',
    displayName: 'Starter',
    description: 'Perfect for new sellers getting started',
    commissionRate: 15,
    escrowHoldDays: 7,
    maxProducts: 10,
    maxTransactionAmount: 500000,
    canFeatureProducts: false,
    canCreateFlashSales: false,
    canBulkUpload: false,
    hasPrioritySupport: false,
    hasAnalytics: false,
    badgeText: 'Starter',
    order: 1,
  },
  {
    tierName: 'VERIFIED',
    displayName: 'Verified',
    description: 'For serious sellers ready to grow',
    commissionRate: 10,
    escrowHoldDays: 5,
    maxProducts: 100,
    maxTransactionAmount: 5000000,
    canFeatureProducts: true,
    canCreateFlashSales: true,
    canBulkUpload: false,
    hasPrioritySupport: false,
    hasAnalytics: true,
    badgeText: '✓ Verified',
    order: 2,
  },
  {
    tierName: 'PREMIUM',
    displayName: 'Premium',
    description: 'For established businesses at scale',
    commissionRate: 8,
    escrowHoldDays: 3,
    maxProducts: -1,
    maxTransactionAmount: -1,
    canFeatureProducts: true,
    canCreateFlashSales: true,
    canBulkUpload: true,
    hasPrioritySupport: true,
    hasAnalytics: true,
    badgeText: '⭐ Premium',
    order: 3,
  },
]

export async function GET() {
  try {
    // Try to get tiers from database
    try {
      const tiers = await prisma.sellerTierConfig.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      })

      if (tiers.length > 0) {
        return NextResponse.json({
          tiers: tiers.map((t) => ({
            ...t,
            commissionRate: toNum(t.commissionRate),
            maxTransactionAmount: toNum(t.maxTransactionAmount),
          })),
        })
      }
    } catch {
      // Table doesn't exist yet — fall through to defaults
    }

    // Return default tiers
    return NextResponse.json({ tiers: DEFAULT_TIERS })
  } catch {
    return NextResponse.json({ tiers: DEFAULT_TIERS })
  }
}
