/**
 * API: Override Store Tier
 * POST /api/admin/tiers/override
 *
 * Allows admin to manually change a store's tier assignment.
 * Updates both Store.verificationTier and Store.commissionRate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// Commission rate lookup from tier name
const TIER_COMMISSION_RATES: Record<string, number> = {
  STARTER: 15,
  VERIFIED: 10,
  PREMIUM: 8,
}

async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true, name: true, email: true },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { storeId, tier } = body

    if (!storeId || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: storeId and tier' },
        { status: 400 }
      )
    }

    const validTiers = ['STARTER', 'VERIFIED', 'PREMIUM']
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the store exists
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        User: { select: { name: true, email: true } },
      },
    })

    if (!existingStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get commission rate for the new tier
    // Try DB first (SellerTierConfig), then fall back to defaults
    let commissionRate = TIER_COMMISSION_RATES[tier] || 15

    try {
      const tierConfig = await prisma.sellerTierConfig.findUnique({
        where: { tierName: tier },
      })
      if (tierConfig) {
        commissionRate = Number(tierConfig.commissionRate)
      }
    } catch {
      // SellerTierConfig table might not exist yet — use defaults
    }

    // Update the store tier and commission rate
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        verificationTier: tier,
        commissionRate,
        // Set verifiedAt when upgrading to VERIFIED or PREMIUM
        ...(tier !== 'STARTER' && !existingStore.isVerified
          ? { isVerified: true, verifiedAt: new Date() }
          : {}),
        ...(tier === 'STARTER' ? {} : {}),
      },
      include: {
        User: { select: { name: true, email: true } },
      },
    })

    // Create a notification for the store owner about the tier change
    try {
      await prisma.notification.create({
        data: {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          userId: existingStore.userId,
          type: 'TIER_CHANGE',
          title: `Your store tier has been updated`,
          message: `DuukaAfrica admin has updated "${existingStore.name}" from ${existingStore.verificationTier || 'STARTER'} to ${tier}. Your commission rate is now ${commissionRate}%.`,
          isRead: false,
        },
      })
    } catch {
      // Notification table might not exist — non-critical
    }

    return NextResponse.json({
      success: true,
      store: {
        ...updatedStore,
        user: updatedStore.User,
      },
      previousTier: existingStore.verificationTier || 'STARTER',
      newTier: tier,
      newCommissionRate: commissionRate,
    })
  } catch (error) {
    console.error('[TIER OVERRIDE ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to override store tier' },
      { status: 500 }
    )
  }
}
