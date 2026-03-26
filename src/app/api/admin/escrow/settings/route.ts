/**
 * API: Platform Escrow Settings
 * 
 * GET/PUT /api/admin/escrow/settings
 * 
 * Manage platform-wide escrow settings
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

// Get escrow settings
export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get or create platform reserve record
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

    // Get or create escrow settings
    let escrowSettings = await prisma.escrowSettings.findFirst()
    
    if (!escrowSettings) {
      escrowSettings = await prisma.escrowSettings.create({
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

    return NextResponse.json({
      settings: {
        // Reserve settings
        reservePercent: reserve.reservePercent,
        minReserve: reserve.minReserve,
        currency: reserve.currency,
        totalReserve: reserve.totalReserve,
        availableReserve: reserve.availableReserve,
        pendingRefunds: reserve.pendingRefunds,
        // Escrow hold days
        defaultEscrowDays: escrowSettings.defaultEscrowDays,
        starterEscrowDays: escrowSettings.starterEscrowDays,
        verifiedEscrowDays: escrowSettings.verifiedEscrowDays,
        premiumEscrowDays: escrowSettings.premiumEscrowDays,
        autoReleaseEnabled: escrowSettings.autoReleaseEnabled,
      }
    })
  } catch (error) {
    console.error('Error fetching escrow settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escrow settings' },
      { status: 500 }
    )
  }
}

// Update escrow settings
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

    // Validate
    if (reservePercent !== undefined && (reservePercent < 0 || reservePercent > 50)) {
      return NextResponse.json(
        { error: 'Reserve percent must be between 0 and 50' },
        { status: 400 }
      )
    }

    if (minReserve !== undefined && minReserve < 0) {
      return NextResponse.json(
        { error: 'Minimum reserve must be positive' },
        { status: 400 }
      )
    }

    // Get or create platform reserve record
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
      // Update existing record
      reserve = await prisma.platformReserve.update({
        where: { id: reserve.id },
        data: {
          ...(reservePercent !== undefined && { reservePercent }),
          ...(minReserve !== undefined && { minReserve }),
        }
      })
    }

    // Update escrow settings
    let escrowSettings = await prisma.escrowSettings.findFirst()
    
    if (!escrowSettings) {
      escrowSettings = await prisma.escrowSettings.create({
        data: {
          defaultEscrowDays: defaultEscrowDays ?? 7,
          starterEscrowDays: starterEscrowDays ?? 7,
          verifiedEscrowDays: verifiedEscrowDays ?? 5,
          premiumEscrowDays: premiumEscrowDays ?? 3,
          starterCommissionRate: 15.0,
          verifiedCommissionRate: 10.0,
          premiumCommissionRate: 8.0,
          autoReleaseEnabled: autoReleaseEnabled ?? true,
          autoReleaseHour: 0,
          disputeResolutionDays: 7,
          minWithdrawalAmount: 50000.0,
        }
      })
    } else {
      escrowSettings = await prisma.escrowSettings.update({
        where: { id: escrowSettings.id },
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
        details: `Admin ${admin.id} updated escrow settings: reservePercent=${reservePercent}, minReserve=${minReserve}`,
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
        defaultEscrowDays: escrowSettings.defaultEscrowDays,
        starterEscrowDays: escrowSettings.starterEscrowDays,
        verifiedEscrowDays: escrowSettings.verifiedEscrowDays,
        premiumEscrowDays: escrowSettings.premiumEscrowDays,
        autoReleaseEnabled: escrowSettings.autoReleaseEnabled,
      }
    })
  } catch (error) {
    console.error('Error updating escrow settings:', error)
    return NextResponse.json(
      { error: 'Failed to update escrow settings' },
      { status: 500 }
    )
  }
}
