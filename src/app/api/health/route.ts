import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Health check endpoint — verifies database and env connectivity.
 * Call GET /api/health to check system status.
 * Returns detailed env var presence (values never exposed).
 */
export async function GET() {
  try {
    // Test basic connectivity
    const start = Date.now()
    const result = await prisma.$queryRaw`SELECT 1 as ok`
    const latency = Date.now() - start

    // Test a product query (the most commonly failing one)
    const productCount = await prisma.product.count()

    // Check critical env vars (values hidden, only presence shown)
    const envCheck = {
      // Database
      DATABASE_URL: !!process.env.DATABASE_URL,
      // Clerk Auth
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
      // Cloudinary
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      // Flutterwave
      FLUTTERWAVE_SECRET_KEY: !!process.env.FLUTTERWAVE_SECRET_KEY,
      NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      // MTN MoMo
      MTN_MOMO_API_KEY: !!process.env.MTN_MOMO_API_KEY,
      // Airtel Money
      AIRTEL_MONEY_API_KEY: !!process.env.AIRTEL_MONEY_API_KEY,
    }

    // Identify missing critical vars
    const missing: string[] = []
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) missing.push('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
    if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY')
    if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET')

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latencyMs: latency,
      productCount,
      env: envCheck,
      uploadReady: missing.length === 0,
      missingUploadVars: missing.length > 0 ? missing : undefined,
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
