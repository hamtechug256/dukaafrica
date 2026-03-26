/**
 * Seller Tier Configuration System
 * 
 * All tier settings are configurable from admin dashboard.
 * This file provides helper functions to work with tiers.
 */

import { prisma } from '@/lib/db'

// Default tier configurations (used if database doesn't have them yet)
export const DEFAULT_TIER_CONFIGS = {
  STARTER: {
    tierName: 'STARTER',
    displayName: 'Starter Seller',
    description: 'New sellers starting their journey. Basic features with buyer protection.',
    
    // Requirements (minimal - everyone starts here)
    requiresIdVerification: false,
    requiresSelfie: false,
    requiresBusinessDoc: false,
    requiresTaxDoc: false,
    requiresPhysicalLocation: false,
    requiresMinOrders: 0,
    requiresMinRating: 0,
    
    // Limits
    maxProducts: 10,
    maxTransactionAmount: 500000, // 500K UGX
    maxDailyOrders: 50,
    
    // Fees
    commissionRate: 15,
    escrowHoldDays: 7,
    
    // Features
    canFeatureProducts: false,
    canCreateFlashSales: false,
    canBulkUpload: false,
    hasPrioritySupport: false,
    hasAnalytics: false,
    
    // Badge
    badgeText: 'Starter',
    badgeColor: 'oklch(0.6 0.1 45)', // Muted terracotta
    
    order: 1,
  },
  
  VERIFIED: {
    tierName: 'VERIFIED',
    displayName: 'Verified Seller',
    description: 'ID verified sellers with proven track record. More features and lower fees.',
    
    // Requirements
    requiresIdVerification: true,
    requiresSelfie: true,
    requiresBusinessDoc: false,
    requiresTaxDoc: false,
    requiresPhysicalLocation: false,
    requiresMinOrders: 0,
    requiresMinRating: 0,
    
    // Limits
    maxProducts: 100,
    maxTransactionAmount: 5000000, // 5M UGX
    maxDailyOrders: 200,
    
    // Fees
    commissionRate: 10, // 5% less than starter!
    escrowHoldDays: 5, // Faster payout
    
    // Features
    canFeatureProducts: true,
    canCreateFlashSales: true,
    canBulkUpload: false,
    hasPrioritySupport: false,
    hasAnalytics: true,
    
    // Badge
    badgeText: '✓ Verified',
    badgeColor: 'oklch(0.55 0.15 140)', // Green
    
    order: 2,
  },
  
  PREMIUM: {
    tierName: 'PREMIUM',
    displayName: 'Premium Seller',
    description: 'Top-tier sellers with business verification. Best rates and exclusive features.',
    
    // Requirements
    requiresIdVerification: true,
    requiresSelfie: true,
    requiresBusinessDoc: true,
    requiresTaxDoc: true,
    requiresPhysicalLocation: false,
    requiresMinOrders: 50,
    requiresMinRating: 4.5,
    
    // Limits
    maxProducts: -1, // Unlimited
    maxTransactionAmount: -1, // Unlimited
    maxDailyOrders: -1, // Unlimited
    
    // Fees
    commissionRate: 8, // Lowest rate!
    escrowHoldDays: 3, // Fastest payout
    
    // Features
    canFeatureProducts: true,
    canCreateFlashSales: true,
    canBulkUpload: true,
    hasPrioritySupport: true,
    hasAnalytics: true,
    
    // Badge
    badgeText: '⭐ Premium',
    badgeColor: 'oklch(0.7 0.15 55)', // Gold
    
    order: 3,
  },
}

// Tier type definition
export interface SellerTier {
  tierName: string
  displayName: string
  description: string | null
  requiresIdVerification: boolean
  requiresSelfie: boolean
  requiresBusinessDoc: boolean
  requiresTaxDoc: boolean
  requiresPhysicalLocation: boolean
  requiresMinOrders: number
  requiresMinRating: number
  maxProducts: number
  maxTransactionAmount: number
  maxDailyOrders: number
  commissionRate: number
  escrowHoldDays: number
  canFeatureProducts: boolean
  canCreateFlashSales: boolean
  canBulkUpload: boolean
  hasPrioritySupport: boolean
  hasAnalytics: boolean
  badgeText: string | null
  badgeColor: string | null
  isActive: boolean
  order: number
}

/**
 * Get tier configuration from database or defaults
 */
export async function getTierConfig(tierName: string): Promise<SellerTier> {
  const dbTier = await prisma.sellerTierConfig.findUnique({
    where: { tierName }
  })
  
  if (dbTier) {
    return dbTier
  }
  
  // Return default if not in database
  const defaultConfig = DEFAULT_TIER_CONFIGS[tierName as keyof typeof DEFAULT_TIER_CONFIGS]
  if (!defaultConfig) {
    return DEFAULT_TIER_CONFIGS.STARTER as SellerTier
  }
  
  return defaultConfig as SellerTier
}

/**
 * Get all tier configurations
 */
export async function getAllTierConfigs(): Promise<SellerTier[]> {
  const dbTiers = await prisma.sellerTierConfig.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  })
  
  if (dbTiers.length > 0) {
    return dbTiers
  }
  
  // Return defaults if not in database
  return Object.values(DEFAULT_TIER_CONFIGS) as SellerTier[]
}

/**
 * Get tier for a store based on their verification status
 */
export async function getStoreTier(store: {
  verificationTier: string
  verificationStatus: string
}): Promise<SellerTier> {
  // If verification is pending or rejected, fall back to starter
  if (store.verificationStatus === 'PENDING' || store.verificationStatus === 'REJECTED') {
    return getTierConfig('STARTER')
  }
  
  return getTierConfig(store.verificationTier)
}

/**
 * Check if store can upgrade to a higher tier
 */
export async function canUpgradeToTier(
  store: {
    verificationStatus: string
    verificationTier: string
    idDocumentUrl: string | null
    selfieWithIdUrl: string | null
    businessDocUrl: string | null
    taxDocUrl: string | null
    physicalLocationUrl: string | null
    totalOrders: number
    rating: number
  },
  targetTier: string
): Promise<{ canUpgrade: boolean; missingRequirements: string[] }> {
  const tierConfig = await getTierConfig(targetTier)
  const missingRequirements: string[] = []
  
  if (tierConfig.requiresIdVerification && !store.idDocumentUrl) {
    missingRequirements.push('Upload ID document')
  }
  
  if (tierConfig.requiresSelfie && !store.selfieWithIdUrl) {
    missingRequirements.push('Upload selfie with ID')
  }
  
  if (tierConfig.requiresBusinessDoc && !store.businessDocUrl) {
    missingRequirements.push('Upload business registration document')
  }
  
  if (tierConfig.requiresTaxDoc && !store.taxDocUrl) {
    missingRequirements.push('Upload tax registration document')
  }
  
  if (tierConfig.requiresPhysicalLocation && !store.physicalLocationUrl) {
    missingRequirements.push('Upload photo of physical location')
  }
  
  if (tierConfig.requiresMinOrders > 0 && store.totalOrders < tierConfig.requiresMinOrders) {
    missingRequirements.push(`Complete ${tierConfig.requiresMinOrders - store.totalOrders} more orders`)
  }
  
  if (tierConfig.requiresMinRating > 0 && store.rating < tierConfig.requiresMinRating) {
    missingRequirements.push(`Improve rating to ${tierConfig.requiresMinRating} stars`)
  }
  
  return {
    canUpgrade: missingRequirements.length === 0,
    missingRequirements
  }
}

/**
 * Get escrow hold days for a store
 */
export async function getEscrowHoldDays(store: {
  verificationTier: string
  verificationStatus: string
}): Promise<number> {
  const tier = await getStoreTier(store)
  return tier.escrowHoldDays
}

/**
 * Get commission rate for a store
 */
export async function getCommissionRate(store: {
  verificationTier: string
  verificationStatus: string
}): Promise<number> {
  const tier = await getStoreTier(store)
  return tier.commissionRate
}

/**
 * Check if store can list more products
 */
export async function canListMoreProducts(
  store: {
    verificationTier: string
    verificationStatus: string
  },
  currentProductCount: number
): Promise<{ canList: boolean; maxProducts: number; remaining: number }> {
  const tier = await getStoreTier(store)
  
  // -1 means unlimited
  if (tier.maxProducts === -1) {
    return { canList: true, maxProducts: -1, remaining: -1 }
  }
  
  const remaining = Math.max(0, tier.maxProducts - currentProductCount)
  
  return {
    canList: remaining > 0,
    maxProducts: tier.maxProducts,
    remaining
  }
}

/**
 * Check if transaction amount is allowed for store
 */
export async function isTransactionAmountAllowed(
  store: {
    verificationTier: string
    verificationStatus: string
  },
  amount: number
): Promise<{ allowed: boolean; maxAmount: number }> {
  const tier = await getStoreTier(store)
  
  // -1 means unlimited
  if (tier.maxTransactionAmount === -1) {
    return { allowed: true, maxAmount: -1 }
  }
  
  return {
    allowed: amount <= tier.maxTransactionAmount,
    maxAmount: tier.maxTransactionAmount
  }
}

/**
 * Initialize default tier configurations in database
 */
export async function initializeDefaultTierConfigs(): Promise<void> {
  for (const [tierName, config] of Object.entries(DEFAULT_TIER_CONFIGS)) {
    await prisma.sellerTierConfig.upsert({
      where: { tierName },
      create: {
        ...config,
        isActive: true,
      },
      update: {
        ...config,
      }
    })
  }
}

/**
 * Get tier display info for UI
 */
export function getTierDisplayInfo(tierName: string): {
  badge: string
  color: string
  description: string
} {
  const configs: Record<string, { badge: string; color: string; description: string }> = {
    STARTER: {
      badge: 'Starter',
      color: 'oklch(0.6 0.1 45)',
      description: 'New seller'
    },
    VERIFIED: {
      badge: '✓ Verified',
      color: 'oklch(0.55 0.15 140)',
      description: 'ID verified'
    },
    PREMIUM: {
      badge: '⭐ Premium',
      color: 'oklch(0.7 0.15 55)',
      description: 'Business verified'
    }
  }
  
  return configs[tierName] || configs.STARTER
}
