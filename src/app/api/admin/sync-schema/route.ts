/**
 * API: Sync Database Schema
 *
 * POST /api/admin/sync-schema
 *
 * Run this once to sync the Prisma schema to the database
 * This creates any missing tables (EscrowSettings, PlatformReserve, Document, etc.)
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

// Helper to check if a table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "${tableName}" LIMIT 1`)
    return true
  } catch {
    return false
  }
}

// Helper to safely create an index
async function safeCreateIndex(indexName: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql)
  } catch {
    // Index might already exist — ignore
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const results: Array<{ table: string; status: string; message?: string }> = []

    // ─────────────────────────────────────────
    // 1. EscrowSettings
    // ─────────────────────────────────────────
    if (!(await tableExists('EscrowSettings'))) {
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
        // Seed default row
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
        } catch { /* ignore duplicate */ }
      } catch (e: any) {
        results.push({ table: 'EscrowSettings', status: 'error', message: e.message })
      }
    }

    // ─────────────────────────────────────────
    // 2. PlatformReserve
    // ─────────────────────────────────────────
    if (!(await tableExists('PlatformReserve'))) {
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
        try {
          await prisma.platformReserve.create({
            data: { id: 'default', totalReserve: 0, availableReserve: 0, pendingRefunds: 0, currency: 'UGX', reservePercent: 10, minReserve: 500000 }
          })
        } catch { /* ignore */ }
      } catch (e: any) {
        results.push({ table: 'PlatformReserve', status: 'error', message: e.message })
      }
    }

    // ─────────────────────────────────────────
    // 3. SellerTierConfig
    // ─────────────────────────────────────────
    if (!(await tableExists('SellerTierConfig'))) {
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
        await safeCreateIndex('SellerTierConfig_tierName', `CREATE UNIQUE INDEX IF NOT EXISTS "SellerTierConfig_tierName_key" ON "SellerTierConfig"("tierName")`)
        await safeCreateIndex('SellerTierConfig_isActive', `CREATE INDEX IF NOT EXISTS "SellerTierConfig_isActive_idx" ON "SellerTierConfig"("isActive")`)
        await safeCreateIndex('SellerTierConfig_order', `CREATE INDEX IF NOT EXISTS "SellerTierConfig_order_idx" ON "SellerTierConfig"("order")`)
        results.push({ table: 'SellerTierConfig', status: 'created' })
      } catch (e: any) {
        results.push({ table: 'SellerTierConfig', status: 'error', message: e.message })
      }
    }

    // ─────────────────────────────────────────
    // 4. EscrowTransaction
    // ─────────────────────────────────────────
    if (!(await tableExists('EscrowTransaction'))) {
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
        await safeCreateIndex('ET_orderId_storeId', `CREATE UNIQUE INDEX IF NOT EXISTS "EscrowTransaction_orderId_storeId_key" ON "EscrowTransaction"("orderId", "storeId")`)
        await safeCreateIndex('ET_status', `CREATE INDEX IF NOT EXISTS "EscrowTransaction_status_idx" ON "EscrowTransaction"("status")`)
        await safeCreateIndex('ET_releaseAt', `CREATE INDEX IF NOT EXISTS "EscrowTransaction_releaseAt_idx" ON "EscrowTransaction"("releaseAt")`)
        await safeCreateIndex('ET_storeId', `CREATE INDEX IF NOT EXISTS "EscrowTransaction_storeId_idx" ON "EscrowTransaction"("storeId")`)
        await safeCreateIndex('ET_buyerId', `CREATE INDEX IF NOT EXISTS "EscrowTransaction_buyerId_idx" ON "EscrowTransaction"("buyerId")`)
        await safeCreateIndex('ET_orderId', `CREATE INDEX IF NOT EXISTS "EscrowTransaction_orderId_idx" ON "EscrowTransaction"("orderId")`)
        results.push({ table: 'EscrowTransaction', status: 'created' })
      } catch (e: any) {
        results.push({ table: 'EscrowTransaction', status: 'error', message: e.message })
      }
    }

    // ─────────────────────────────────────────
    // 5. Document (Document/Resource Management)
    // ─────────────────────────────────────────
    if (!(await tableExists('Document'))) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Document" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "slug" TEXT NOT NULL,
            "category" TEXT NOT NULL DEFAULT 'GENERAL',
            "fileType" TEXT NOT NULL DEFAULT 'PDF',
            "fileSize" INTEGER NOT NULL DEFAULT 0,
            "fileUrl" TEXT NOT NULL,
            "fileKey" TEXT,
            "thumbnailUrl" TEXT,
            "downloadCount" INTEGER NOT NULL DEFAULT 0,
            "isPublished" BOOLEAN NOT NULL DEFAULT false,
            "isFeatured" BOOLEAN NOT NULL DEFAULT false,
            "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "createdBy" TEXT,
            "updatedBy" TEXT,
            CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
          );
        `)
        // Indexes
        await safeCreateIndex('Doc_slug', `CREATE UNIQUE INDEX IF NOT EXISTS "Document_slug_key" ON "Document"("slug")`)
        await safeCreateIndex('Doc_category', `CREATE INDEX IF NOT EXISTS "Document_category_idx" ON "Document"("category")`)
        await safeCreateIndex('Doc_isPublished', `CREATE INDEX IF NOT EXISTS "Document_isPublished_idx" ON "Document"("isPublished")`)
        await safeCreateIndex('Doc_targetAudience', `CREATE INDEX IF NOT EXISTS "Document_targetAudience_idx" ON "Document"("targetAudience")`)
        await safeCreateIndex('Doc_isFeatured', `CREATE INDEX IF NOT EXISTS "Document_isFeatured_idx" ON "Document"("isFeatured")`)
        await safeCreateIndex('Doc_sortOrder', `CREATE INDEX IF NOT EXISTS "Document_sortOrder_idx" ON "Document"("sortOrder")`)
        await safeCreateIndex('Doc_createdAt', `CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt")`)
        results.push({ table: 'Document', status: 'created' })
      } catch (e: any) {
        results.push({ table: 'Document', status: 'error', message: e.message })
      }
    }

    // ─────────────────────────────────────────
    // 6. Add Document FK column to User table
    // ─────────────────────────────────────────
    try {
      // Check if createdBy column exists on User table
      const colExists = await prisma.$queryRawUnsafe(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'createdBy'
      `) as any[]

      if (!colExists || colExists.length === 0) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "User" ADD COLUMN "createdBy" TEXT;
        `)
        // Add foreign key constraint
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "Document" ADD CONSTRAINT "Document_createdBy_fkey"
              FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          `)
        } catch {
          // Constraint might already exist
        }
        results.push({ table: 'User', status: 'altered', message: 'Added createdBy column' })
      }
    } catch (e: any) {
      results.push({ table: 'User', status: 'skipped', message: `Could not check/alter User table: ${e.message}` })
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

    const tableNames = ['EscrowSettings', 'PlatformReserve', 'SellerTierConfig', 'EscrowTransaction', 'Document']
    const tables: Record<string, boolean> = {}

    for (const name of tableNames) {
      try {
        tables[name] = await tableExists(name)
      } catch {
        tables[name] = false
      }
    }

    return NextResponse.json({
      tables,
      allExist: Object.values(tables).every(Boolean)
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check tables' }, { status: 500 })
  }
}
