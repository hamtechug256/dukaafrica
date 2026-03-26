/**
 * API: Get/Set Seller Tier Configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { initializeDefaultTierConfigs } from '@/lib/seller-tiers'

async function checkAdminAccess() {
  const { userId } = await auth()
  if (!userId) return null
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true }
  })
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
  return user
}

export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    await initializeDefaultTierConfigs()
    const tiers = await prisma.sellerTierConfig.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })
    return NextResponse.json({ tiers })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await request.json()
    const updatedTier = await prisma.sellerTierConfig.update({
      where: { tierName: body.tierName },
      data: body
    })
    return NextResponse.json({ success: true, tier: updatedTier })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 })
  }
}
