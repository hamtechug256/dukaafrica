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

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latencyMs: latency,
      productCount,
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
