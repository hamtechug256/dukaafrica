/**
 * Auto-Tier Promotion Engine
 *
 * Evaluates verified stores against tier configurations and automatically
 * promotes them when they meet all requirements (min orders, min rating).
 * Doc-based requirements (ID verification, business docs, etc.) are skipped
 * since stores with verificationStatus='VERIFIED' already have those.
 *
 * This module is called:
 * 1. After escrow release (non-blocking, fire-and-forget)
 * 2. By the /api/cron/auto-tier endpoint (periodic)
 */

import { prisma } from '@/lib/db'
import { getAllTierConfigs, type SellerTier } from './seller-tiers'
import { Prisma } from '@prisma/client'

export interface PromotionResult {
  storeId: string
  storeName: string
  previousTier: string
  newTier: string
  newCommissionRate: number
}

export interface AutoTierSummary {
  evaluated: number
  promoted: number
  promotions: PromotionResult[]
  errors: string[]
}

/**
 * Evaluate all verified stores and promote those that qualify for a higher tier.
 */
export async function evaluateAndPromoteStores(): Promise<AutoTierSummary> {
  const summary: AutoTierSummary = {
    evaluated: 0,
    promoted: 0,
    promotions: [],
    errors: [],
  }

  try {
    // 1. Fetch all active tier configs sorted by order ASC
    const tierConfigs = await getAllTierConfigs()

    if (tierConfigs.length === 0) {
      console.log('[AUTO-TIER] No tier configs found — skipping evaluation')
      return summary
    }

    // 2. Fetch all stores that are verified and active
    const stores = await prisma.store.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        verificationTier: true,
        totalOrders: true,
        rating: true,
      },
    })

    summary.evaluated = stores.length

    if (stores.length === 0) {
      console.log('[AUTO-TIER] No verified active stores to evaluate')
      return summary
    }

    // 3. For each store, check if it qualifies for a higher tier
    for (const store of stores) {
      try {
        // Find the current tier config to get its order
        const currentTierConfig = tierConfigs.find(
          (t) => t.tierName === store.verificationTier
        )

        const currentOrder = currentTierConfig?.order ?? 0

        // Look at tiers above the current one
        const higherTiers = tierConfigs.filter(
          (t) => t.order > currentOrder && t.isActive
        )

        // Sort by order ASC so we promote to the highest possible tier
        higherTiers.sort((a, b) => a.order - b.order)

        for (const tier of higherTiers) {
          if (meetsTierRequirements(store, tier)) {
            // 4. Promote the store
            await promoteStore(store, tier)

            summary.promoted++
            summary.promotions.push({
              storeId: store.id,
              storeName: store.name,
              previousTier: store.verificationTier,
              newTier: tier.tierName,
              newCommissionRate: tier.commissionRate,
            })

            console.log(
              `[AUTO-TIER] Promoted "${store.name}" (${store.id}) from ${store.verificationTier} → ${tier.tierName}`
            )

            // After promotion, the store now has a new tier —
            // break so next iteration of higherTiers starts from the new tier
            // (though a single evaluation run typically promotes at most one level)
            break
          }
        }
      } catch (storeError) {
        const msg =
          storeError instanceof Error
            ? storeError.message
            : 'Unknown error'
        summary.errors.push(`Store ${store.name} (${store.id}): ${msg}`)
        console.error(
          `[AUTO-TIER] Error evaluating store ${store.name}:`,
          storeError
        )
      }
    }

    console.log(
      `[AUTO-TIER] Evaluation complete: ${summary.evaluated} evaluated, ${summary.promoted} promoted`
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    summary.errors.push(`System error: ${msg}`)
    console.error('[AUTO-TIER] Fatal error in evaluateAndPromoteStores:', error)
  }

  return summary
}

/**
 * Check if a store meets all auto-promotable requirements for a given tier.
 * Doc-based requirements are skipped since the store is already VERIFIED.
 */
function meetsTierRequirements(
  store: {
    totalOrders: number
    rating: number
  },
  tier: SellerTier
): boolean {
  // Check minimum orders
  if (tier.requiresMinOrders > 0 && store.totalOrders < tier.requiresMinOrders) {
    return false
  }

  // Check minimum rating
  if (tier.requiresMinRating > 0 && store.rating < tier.requiresMinRating) {
    return false
  }

  // Doc-based requirements are already met (store is VERIFIED)
  // These are skipped: requiresIdVerification, requiresSelfie, requiresBusinessDoc,
  // requiresTaxDoc, requiresPhysicalLocation

  return true
}

/**
 * Promote a store to a new tier: update tier, commission rate, and notify the seller.
 */
async function promoteStore(
  store: { id: string; name: string; userId: string },
  tier: SellerTier
): Promise<void> {
  const commissionRate =
    tier.commissionRate instanceof Prisma.Decimal
      ? tier.commissionRate.toNumber()
      : typeof tier.commissionRate === 'number'
        ? tier.commissionRate
        : Number(tier.commissionRate) || 0

  // Update store tier and commission
  await prisma.store.update({
    where: { id: store.id },
    data: {
      verificationTier: tier.tierName,
      commissionRate: commissionRate,
      verifiedAt: new Date(),
    },
  })

  // Notify the seller
  try {
    await prisma.notification.create({
      data: {
        userId: store.userId,
        type: 'TIER_PROMOTION',
        title: 'Tier Upgraded! 🎉',
        message: `Congratulations! You've been promoted to ${tier.displayName || tier.tierName} tier. Your commission rate is now ${commissionRate}% and you have access to new features.`,
        data: JSON.stringify({
          previousTier: store.verificationTier,
          newTier: tier.tierName,
          commissionRate: commissionRate,
        }),
      },
    })
  } catch (notifError) {
    // Non-fatal: notification failure should not break promotion
    console.error(
      `[AUTO-TIER] Failed to create promotion notification for ${store.name}:`,
      notifError
    )
  }
}
