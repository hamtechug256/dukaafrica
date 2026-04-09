/**
 * ONE-TIME MIGRATION: Add Pesapal columns to database
 *
 * Visit https://www.duukaafrica.com/api/migrate-pesapal to run.
 * DELETE THIS FILE AFTER RUNNING.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const results: string[] = []

    // Add Pesapal columns to PlatformSettings
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "pesapalClientId" TEXT;
    `)
    results.push('pesapalClientId added')

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "pesapalClientSecret" TEXT;
    `)
    results.push('pesapalClientSecret added')

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "pesapalIpnId" TEXT;
    `)
    results.push('pesapalIpnId added')

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "pesapalEnvironment" TEXT DEFAULT 'sandbox';
    `)
    results.push('pesapalEnvironment added')

    // Add pesapalMerchantId to Store table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "pesapalMerchantId" TEXT;
    `)
    results.push('pesapalMerchantId added to Store')

    return NextResponse.json({
      success: true,
      message: 'Migration complete. This endpoint should be deleted now.',
      columnsAdded: results,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
