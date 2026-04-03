import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Health check endpoint — verifies database connectivity.
 * Call GET /api/health to check if the DB is reachable.
 * Returns detailed error info for diagnostics.
 */
export async function GET() {
  try {
    // Test basic connectivity
    const start = Date.now()
    const result = await prisma.$queryRaw`SELECT 1 as ok`
    const latency = Date.now() - start

    // Test a product query (the most commonly failing one)
    const productCount = await prisma.product.count()

    // Check if deletedAt column exists
    let deletedAtExists = false
    try {
      await prisma.$queryRaw`SELECT "deletedAt" FROM "Product" LIMIT 0`
      deletedAtExists = true
    } catch {
      deletedAtExists = false
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latencyMs: latency,
      productCount,
      deletedAtColumnExists: deletedAtExists,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    const name = error instanceof Error ? error.constructor.name : 'Error'

    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: {
        name,
        message,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}

/**
 * One-time schema repair endpoint.
 * Call POST /api/health to add missing columns to the Product table.
 * This is safe to run multiple times (uses IF NOT EXISTS).
 */
export async function POST() {
  try {
    const results: { column: string; status: string; error?: string }[] = []

    // Add deletedAt column if missing
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP
      `
      results.push({ column: 'deletedAt', status: 'added or exists' })
    } catch (e: any) {
      results.push({ column: 'deletedAt', status: 'error', error: e.message })
    }

    // Also add other columns that may be missing due to schema drift
    const missingColumns = [
      { name: 'shortDesc', type: 'TEXT' },
      { name: 'videos', type: 'TEXT' },
      { name: 'barcode', type: 'TEXT' },
      { name: 'allowBackorder', type: 'BOOLEAN DEFAULT false' },
      { name: 'variantOptions', type: 'TEXT' },
      { name: 'weight', type: 'DOUBLE PRECISION' },
      { name: 'length', type: 'DOUBLE PRECISION' },
      { name: 'width', type: 'DOUBLE PRECISION' },
      { name: 'height', type: 'DOUBLE PRECISION' },
      { name: 'localShippingOnly', type: 'BOOLEAN DEFAULT false' },
      { name: 'shipsToCountries', type: 'TEXT' },
      { name: 'isTrending', type: 'BOOLEAN DEFAULT false' },
      { name: 'isFlashSale', type: 'BOOLEAN DEFAULT false' },
      { name: 'flashSaleStart', type: 'TIMESTAMP' },
      { name: 'flashSaleEnd', type: 'TIMESTAMP' },
      { name: 'flashSaleDiscount', type: 'DECIMAL(20,2)' },
      { name: 'flashSaleStock', type: 'INTEGER' },
      { name: 'flashSaleClaimed', type: 'INTEGER DEFAULT 0' },
      { name: 'viewCount', type: 'INTEGER DEFAULT 0' },
      { name: 'purchaseCount', type: 'INTEGER DEFAULT 0' },
      { name: 'rating', type: 'DOUBLE PRECISION DEFAULT 0' },
      { name: 'reviewCount', type: 'INTEGER DEFAULT 0' },
      { name: 'submittedForReview', type: 'BOOLEAN DEFAULT false' },
      { name: 'rejectionReason', type: 'TEXT' },
      { name: 'reviewedAt', type: 'TIMESTAMP' },
      { name: 'reviewedBy', type: 'TEXT' },
      { name: 'metaTitle', type: 'TEXT' },
      { name: 'metaDesc', type: 'TEXT' },
      { name: 'keywords', type: 'TEXT' },
      { name: 'costPrice', type: 'DECIMAL(20,2)' },
      { name: 'comparePrice', type: 'DECIMAL(20,2)' },
    ]

    for (const col of missingColumns) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`
        )
        results.push({ column: col.name, status: 'added or exists' })
      } catch (e: any) {
        results.push({ column: col.name, status: 'error', error: e.message })
      }
    }

    // Reset the column cache so the soft-delete filter picks up the new column
    const { PrismaClient } = await import('@prisma/client')
    // Re-test product query after migration
    let productCount = 0
    try {
      productCount = await prisma.product.count()
    } catch (e: any) {
      results.push({ column: '_post_migration_test', status: 'error', error: e.message })
    }

    const errors = results.filter(r => r.status === 'error')

    return NextResponse.json({
      status: errors.length === 0 && productCount >= 0 ? 'success' : 'partial',
      productCount,
      columns: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      status: 'error',
      error: message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
