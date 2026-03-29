/**
 * API: Sync Database Schema
 * 
 * POST /api/admin/sync-schema
 * 
 * Run this once to sync the Prisma schema to the database
 * This creates any missing tables (EscrowSettings, PlatformReserve, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

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

export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if EscrowSettings table exists by trying to query it
    let escrowSettingsExists = false
    try {
      await prisma.escrowSettings.findFirst()
      escrowSettingsExists = true
    } catch (e: any) {
      // Table doesn't exist
      console.log('EscrowSettings table does not exist yet')
    }

    // Check if PlatformReserve table exists
    let platformReserveExists = false
    try {
      await prisma.platformReserve.findFirst()
      platformReserveExists = true
    } catch (e: any) {
      console.log('PlatformReserve table does not exist yet')
    }

    // Check if SellerTierConfig table exists
    let sellerTierConfigExists = false
    try {
      await prisma.sellerTierConfig.findFirst()
      sellerTierConfigExists = true
    } catch (e: any) {
      console.log('SellerTierConfig table does not exist yet')
    }

    // Check if EscrowTransaction table exists
    let escrowTransactionExists = false
    try {
      await prisma.escrowTransaction.findFirst()
      escrowTransactionExists = true
    } catch (e: any) {
      console.log('EscrowTransaction table does not exist yet')
    }

    // If all tables exist, no need to sync
    if (escrowSettingsExists && platformReserveExists && sellerTierConfigExists && escrowTransactionExists) {
      return NextResponse.json({
        success: true,
        message: 'All tables already exist. No sync needed.',
        tables: {
          escrowSettings: 'exists',
          platformReserve: 'exists',
          sellerTierConfig: 'exists',
          escrowTransaction: 'exists'
        }
      })
    }

    // Try to create the missing tables using raw SQL
    const results: Array<{ table: string; status: string; message?: string }> = []

    // Create EscrowSettings table if missing
    if (!escrowSettingsExists) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "EscrowSettings" (
            "id" TEXT NOT NULL,
            "defaultEscrowDays" INTEGER NOT NULL DEFAULT 7,
            "starterEscrowDays" INTEGER NOT NULL DEFAULT 7,
            "verifiedEscrowDays" INTEGER NOT NULL DEFAULT 5,
            "premiumEscrowDays" INTEGER NOT NULL DEFAULT 3,
            "starterCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 15,
            "verifiedCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
            "premiumCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 8,
            "autoReleaseEnabled" BOOLEAN NOT NULL DEFAULT true,
            "autoReleaseCronSecret" TEXT,
            "autoReleaseHour" INTEGER NOT NULL DEFAULT 0,
            "disputeResolutionDays" INTEGER NOT NULL DEFAULT 7,
            "minWithdrawalAmount" DOUBLE PRECISION NOT NULL DEFAULT 50000,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "EscrowSettings_pkey" PRIMARY KEY ("id")
          );
        `)
        results.push({ table: 'EscrowSettings', status: 'created' })
      } catch (e: any) {
        results.push({ table: 'EscrowSettings', status: 'error', message: e.message })
      }
    }

    // Create PlatformReserve table if missing
    if (!platformReserveExists) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "PlatformReserve" (
            "id" TEXT NOT NULL,
            "totalReserve" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "availableReserve" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "pendingRefunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "currency" TEXT NOT NULL DEFAULT 'UGX',
            "reservePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
            "minReserve" DOUBLE PRECISION NOT NULL DEFAULT 500000,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "PlatformReserve_pkey" PRIMARY KEY ("id")
          );
        `)
        results.push({ table: 'PlatformReserve', status: 'created' })
      } catch (e: any) {
        results.push({ table: 'PlatformReserve', status: 'error', message: e.message })
      }
    }

    // Create SellerTierConfig table if missing
    if (!sellerTierConfigExists) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "SellerTierConfig" (
            "id" TEXT NOT NULL,
            "tierName" TEXT NOT NULL,
            "displayName" TEXT NOT NULL,
            "description" TEXT,
            "requiresIdVerification" BOOLEAN NOT NULL DEFAULT false,
            "requiresSelfie" BOOLEAN NOT NULL DEFAULT false,
            "requiresBusinessDoc" BOOLEAN NOT NULL DEFAULT false,
            "requiresTaxDoc" BOOLEAN NOT NULL DEFAULT false,
            "requiresPhysicalLocation" BOOLEAN NOT NULL DEFAULT false,
            "requiresMinOrders" INTEGER NOT NULL DEFAULT 0,
            "requiresMinRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "maxProducts" INTEGER NOT NULL DEFAULT 10,
            "maxTransactionAmount" DOUBLE PRECISION NOT NULL DEFAULT 500000,
            "maxDailyOrders" INTEGER NOT NULL DEFAULT 50,
            "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 15,
            "escrowHoldDays" INTEGER NOT NULL DEFAULT 7,
            "canFeatureProducts" BOOLEAN NOT NULL DEFAULT false,
            "canCreateFlashSales" BOOLEAN NOT NULL DEFAULT false,
            "canBulkUpload" BOOLEAN NOT NULL DEFAULT false,
            "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
            "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
            "badgeText" TEXT,
            "badgeColor" TEXT,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "order" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "SellerTierConfig_pkey" PRIMARY KEY ("id")
          );
        `)
        // Add unique constraint for tierName
        try {
          await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "SellerTierConfig_tierName_key" ON "SellerTierConfig"("tierName");
          `)
        } catch (e) {
          // Index might already exist
        }
        // Add index for isActive
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "SellerTierConfig_isActive_idx" ON "SellerTierConfig"("isActive");
          `)
        } catch (e) {
          // Index might already exist
        }
        // Add index for order
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "SellerTierConfig_order_idx" ON "SellerTierConfig"("order");
          `)
        } catch (e) {
          // Index might already exist
        }
        results.push({ table: 'SellerTierConfig', status: 'created' })
      } catch (e: any) {
        results.push({ table: 'SellerTierConfig', status: 'error', message: e.message })
      }
    }

    // Create EscrowTransaction table if missing
    if (!escrowTransactionExists) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "EscrowTransaction" (
            "id" TEXT NOT NULL,
            "orderId" TEXT NOT NULL,
            "storeId" TEXT NOT NULL,
            "buyerId" TEXT NOT NULL,
            "amount" DOUBLE PRECISION,
            "grossAmount" DOUBLE PRECISION,
            "sellerAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "platformFee" DOUBLE PRECISION,
            "platformAmount" DOUBLE PRECISION,
            "currency" TEXT NOT NULL DEFAULT 'UGX',
            "status" TEXT NOT NULL DEFAULT 'HELD',
            "releaseAt" TIMESTAMP(3),
            "releaseType" TEXT,
            "releasedAt" TIMESTAMP(3),
            "autoReleased" BOOLEAN NOT NULL DEFAULT false,
            "releasedBy" TEXT,
            "refundAmount" DOUBLE PRECISION,
            "refundReason" TEXT,
            "refundedAt" TIMESTAMP(3),
            "refundedBy" TEXT,
            "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
          );
        `)
        // Add unique constraint for orderId
        try {
          await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "EscrowTransaction_orderId_key" ON "EscrowTransaction"("orderId");
          `)
        } catch (e) {}
        // Add indexes
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "EscrowTransaction_status_idx" ON "EscrowTransaction"("status");
          `)
        } catch (e) {}
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "EscrowTransaction_releaseAt_idx" ON "EscrowTransaction"("releaseAt");
          `)
        } catch (e) {}
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "EscrowTransaction_storeId_idx" ON "EscrowTransaction"("storeId");
          `)
        } catch (e) {}
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "EscrowTransaction_buyerId_idx" ON "EscrowTransaction"("buyerId");
          `)
        } catch (e) {}
        try {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "EscrowTransaction_orderId_idx" ON "EscrowTransaction"("orderId");
          `)
        } catch (e) {}
        results.push({ table: 'EscrowTransaction', status: 'created' })
      } catch (e: any) {
        results.push({ table: 'EscrowTransaction', status: 'error', message: e.message })
      }
    }

    // Create default EscrowSettings if created
    if (!escrowSettingsExists) {
      try {
        await prisma.escrowSettings.create({
          data: {
            id: 'default',
            defaultEscrowDays: 7,
            starterEscrowDays: 7,
            verifiedEscrowDays: 5,
            premiumEscrowDays: 3,
            starterCommissionRate: 15,
            verifiedCommissionRate: 10,
            premiumCommissionRate: 8,
            autoReleaseEnabled: true,
            autoReleaseHour: 0,
            disputeResolutionDays: 7,
            minWithdrawalAmount: 50000,
          }
        })
      } catch (e) {
        // Ignore
      }
    }

    // Create default PlatformReserve if created
    if (!platformReserveExists) {
      try {
        await prisma.platformReserve.create({
          data: {
            id: 'default',
            totalReserve: 0,
            availableReserve: 0,
            pendingRefunds: 0,
            currency: 'UGX',
            reservePercent: 10,
            minReserve: 500000,
          }
        })
      } catch (e) {
        // Ignore
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema sync completed',
      results
    })

  } catch (error) {
    console.error('Schema sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync schema', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET to check status
export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const tables = {
      escrowSettings: false,
      platformReserve: false,
      sellerTierConfig: false,
      escrowTransaction: false,
    }

    try {
      await prisma.escrowSettings.findFirst()
      tables.escrowSettings = true
    } catch (e) {}

    try {
      await prisma.platformReserve.findFirst()
      tables.platformReserve = true
    } catch (e) {}

    try {
      await prisma.sellerTierConfig.findFirst()
      tables.sellerTierConfig = true
    } catch (e) {}

    try {
      await prisma.escrowTransaction.findFirst()
      tables.escrowTransaction = true
    } catch (e) {}

    return NextResponse.json({
      tables,
      allExist: tables.escrowSettings && tables.platformReserve && tables.sellerTierConfig && tables.escrowTransaction
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check tables' }, { status: 500 })
  }
}
