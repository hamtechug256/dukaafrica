import { NextResponse } from 'next/server'
import { basePrisma } from '@/lib/db'

/**
 * Health check endpoint — tests database connectivity and returns diagnostic info.
 * Call GET /api/health to verify the DB is reachable and responsive.
 * This endpoint is public (no auth) for quick monitoring.
 */
export async function GET() {
  const start = Date.now()
  const result: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {},
  }

  try {
    // Test 1: Simple query
    const queryStart = Date.now()
    const userCount = await basePrisma.user.count()
    const queryMs = Date.now() - queryStart
    result.checks.db = {
      status: 'ok',
      latency: `${queryMs}ms`,
      userCount,
    }

    // Test 2: Product count (tests the table used by most pages)
    const productStart = Date.now()
    const productCount = await basePrisma.product.count()
    const productMs = Date.now() - productStart
    result.checks.products = {
      status: 'ok',
      latency: `${productMs}ms`,
      total: productCount,
    }

    // Test 3: Active products count
    const activeCount = await basePrisma.product.count({
      where: { status: 'ACTIVE', deletedAt: null },
    })
    result.checks.products.active = activeCount

    // Test 4: Categories count
    const categoryCount = await basePrisma.category.count()
    result.checks.categories = { total: categoryCount }

    // Test 5: Stores count
    const storeCount = await basePrisma.store.count()
    result.checks.stores = { total: storeCount }

  } catch (error: any) {
    result.status = 'error'
    result.checks.db = {
      status: 'error',
      message: error?.message || 'Unknown error',
      code: error?.code || null,
      meta: error?.meta || null,
    }
    console.error('[Health] Database check failed:', error)
  }

  result.totalLatency = `${Date.now() - start}ms`

  return NextResponse.json(result, {
    status: result.status === 'ok' ? 200 : 503,
  })
}
