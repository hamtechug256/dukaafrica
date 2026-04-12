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

    // Check if Banner and Announcement tables exist
    let bannerTableExists = false
    let bannerCount = 0
    let announcementTableExists = false
    try {
      bannerCount = await prisma.banner.count()
      bannerTableExists = true
    } catch {
      bannerTableExists = false
    }
    try {
      await prisma.announcement.count()
      announcementTableExists = true
    } catch {
      announcementTableExists = false
    }

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
      // Pesapal
      PESAPAL_CLIENT_ID: !!process.env.PESAPAL_CLIENT_ID,
      PESAPAL_CLIENT_SECRET: !!process.env.PESAPAL_CLIENT_SECRET,
      PESAPAL_IPN_ID: !!process.env.PESAPAL_IPN_ID,
      NEXT_PUBLIC_PESAPAL_ENV: !!process.env.NEXT_PUBLIC_PESAPAL_ENV,
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
      tables: {
        banner: bannerTableExists ? `exists (${bannerCount} rows)` : 'MISSING',
        announcement: announcementTableExists ? 'exists' : 'MISSING',
      },
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
