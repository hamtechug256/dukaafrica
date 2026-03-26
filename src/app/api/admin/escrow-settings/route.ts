/**
 * API: Platform Escrow Settings (Backwards Compatibility)
 * 
 * This endpoint redirects to the new escrow settings structure.
 * Kept for backwards compatibility with cached frontend code.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

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
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get or create escrow settings
    let settings = await prisma.escrowSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.escrowSettings.create({
        data: {
          defaultEscrowDays: 7,
          starterEscrowDays: 7,
          verifiedEscrowDays: 5,
          premiumEscrowDays: 3,
          starterCommissionRate: 15.0,
          verifiedCommissionRate: 10.0,
          premiumCommissionRate: 8.0,
          autoReleaseEnabled: true,
          autoReleaseHour: 0,
          disputeResolutionDays: 7,
          minWithdrawalAmount: 50000.0,
        }
      })
    }

    // Get platform reserve
    let reserve = await prisma.platformReserve.findFirst()
    
    if (!reserve) {
      reserve = await prisma.platformReserve.create({
        data: {
          totalReserve: 0,
          availableReserve: 0,
          pendingRefunds: 0,
          currency: 'UGX',
          reservePercent: 10,
          minReserve: 500000,
        }
      })
    }

    return NextResponse.json({
      settings: {
        reservePercent: reserve.reservePercent,
        minReserve: reserve.minReserve,
        currency: reserve.currency,
        totalReserve: reserve.totalReserve,
        availableReserve: reserve.availableReserve,
        pendingRefunds: reserve.pendingRefunds,
        defaultEscrowDays: settings.defaultEscrowDays,
        starterEscrowDays: settings.starterEscrowDays,
        verifiedEscrowDays: settings.verifiedEscrowDays,
        premiumEscrowDays: settings.premiumEscrowDays,
        autoReleaseEnabled: settings.autoReleaseEnabled,
        autoReleaseCronSecret: settings.autoReleaseCronSecret,
      }
    })
  } catch (error) {
    console.error('Error fetching escrow settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escrow settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const {
      reservePercent,
      minReserve,
      defaultEscrowDays,
      starterEscrowDays,
      verifiedEscrowDays,
      premiumEscrowDays,
      autoReleaseEnabled,
    } = body

    // Update platform reserve
    let reserve = await prisma.platformReserve.findFirst()
    
    if (!reserve) {
      reserve = await prisma.platformReserve.create({
        data: {
          totalReserve: 0,
          availableReserve: 0,
          pendingRefunds: 0,
          currency: 'UGX',
          reservePercent: reservePercent ?? 10,
          minReserve: minReserve ?? 500000,
        }
      })
    } else {
      reserve = await prisma.platformReserve.update({
        where: { id: reserve.id },
        data: {
          ...(reservePercent !== undefined && { reservePercent }),
          ...(minReserve !== undefined && { minReserve }),
        }
      })
    }

    // Update escrow settings
    let settings = await prisma.escrowSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.escrowSettings.create({
        data: {
          defaultEscrowDays: defaultEscrowDays ?? 7,
          starterEscrowDays: starterEscrowDays ?? 7,
          verifiedEscrowDays: verifiedEscrowDays ?? 5,
          premiumEscrowDays: premiumEscrowDays ?? 3,
          autoReleaseEnabled: autoReleaseEnabled ?? true,
          autoReleaseHour: 0,
          disputeResolutionDays: 7,
          minWithdrawalAmount: 50000,
        }
      })
    } else {
      settings = await prisma.escrowSettings.update({
        where: { id: settings.id },
        data: {
          ...(defaultEscrowDays !== undefined && { defaultEscrowDays }),
          ...(starterEscrowDays !== undefined && { starterEscrowDays }),
          ...(verifiedEscrowDays !== undefined && { verifiedEscrowDays }),
          ...(premiumEscrowDays !== undefined && { premiumEscrowDays }),
          ...(autoReleaseEnabled !== undefined && { autoReleaseEnabled }),
        }
      })
    }

    // Log the change
    await prisma.securityLog.create({
      data: {
        type: 'ESCROW_SETTINGS_UPDATED',
        identifier: admin.id,
        details: `Admin ${admin.id} updated escrow settings`,
      }
    })

    return NextResponse.json({
      success: true,
      settings: {
        reservePercent: reserve.reservePercent,
        minReserve: reserve.minReserve,
        currency: reserve.currency,
        totalReserve: reserve.totalReserve,
        availableReserve: reserve.availableReserve,
        pendingRefunds: reserve.pendingRefunds,
        defaultEscrowDays: settings.defaultEscrowDays,
        starterEscrowDays: settings.starterEscrowDays,
        verifiedEscrowDays: settings.verifiedEscrowDays,
        premiumEscrowDays: settings.premiumEscrowDays,
        autoReleaseEnabled: settings.autoReleaseEnabled,
      }
    })
  } catch (error) {
    console.error('Error updating escrow settings:', error)
    return NextResponse.json(
      { error: 'Failed to update escrow settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
