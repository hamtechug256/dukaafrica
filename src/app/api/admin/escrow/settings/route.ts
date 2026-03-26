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

// Get escrow settings
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
          starterCommissionRate: 15,
          verifiedCommissionRate: 10,
          premiumCommissionRate: 8,
          autoReleaseEnabled: true,
          autoReleaseHour: 0,
          disputeResolutionDays: 7,
          minWithdrawalAmount: 50000,
        }
      })
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

    return NextResponse.json({
      settings: {
        defaultEscrowDays: settings.defaultEscrowDays,
        starterEscrowDays: settings.starterEscrowDays,
        verifiedEscrowDays: settings.verifiedEscrowDays,
        premiumEscrowDays: settings.premiumEscrowDays,
        starterCommissionRate: settings.starterCommissionRate,
        verifiedCommissionRate: settings.verifiedCommissionRate,
        premiumCommissionRate: settings.premiumCommissionRate,
        autoReleaseEnabled: settings.autoReleaseEnabled,
        disputeResolutionDays: settings.disputeResolutionDays,
        minWithdrawalAmount: settings.minWithdrawalAmount,
      },
      reserve: {
        reservePercent: reserve.reservePercent,
        minReserve: reserve.minReserve,
        currency: reserve.currency,
        totalReserve: reserve.totalReserve,
        availableReserve: reserve.availableReserve,
        pendingRefunds: reserve.pendingRefunds,
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
      starterCommissionRate,
      verifiedCommissionRate,
      premiumCommissionRate,
      autoReleaseEnabled,
      disputeResolutionDays,
      minWithdrawalAmount,
    } = body

    // Validate reserve settings
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
    } else if (reservePercent !== undefined || minReserve !== undefined) {
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
    
    const settingsData: any = {}
    if (defaultEscrowDays !== undefined) settingsData.defaultEscrowDays = defaultEscrowDays
    if (starterEscrowDays !== undefined) settingsData.starterEscrowDays = starterEscrowDays
    if (verifiedEscrowDays !== undefined) settingsData.verifiedEscrowDays = verifiedEscrowDays
    if (premiumEscrowDays !== undefined) settingsData.premiumEscrowDays = premiumEscrowDays
    if (starterCommissionRate !== undefined) settingsData.starterCommissionRate = starterCommissionRate
    if (verifiedCommissionRate !== undefined) settingsData.verifiedCommissionRate = verifiedCommissionRate
    if (premiumCommissionRate !== undefined) settingsData.premiumCommissionRate = premiumCommissionRate
    if (autoReleaseEnabled !== undefined) settingsData.autoReleaseEnabled = autoReleaseEnabled
    if (disputeResolutionDays !== undefined) settingsData.disputeResolutionDays = disputeResolutionDays
    if (minWithdrawalAmount !== undefined) settingsData.minWithdrawalAmount = minWithdrawalAmount

    if (!settings) {
      settings = await prisma.escrowSettings.create({
        data: {
          defaultEscrowDays: defaultEscrowDays ?? 7,
          starterEscrowDays: starterEscrowDays ?? 7,
          verifiedEscrowDays: verifiedEscrowDays ?? 5,
          premiumEscrowDays: premiumEscrowDays ?? 3,
          starterCommissionRate: starterCommissionRate ?? 15,
          verifiedCommissionRate: verifiedCommissionRate ?? 10,
          premiumCommissionRate: premiumCommissionRate ?? 8,
          autoReleaseEnabled: autoReleaseEnabled ?? true,
          disputeResolutionDays: disputeResolutionDays ?? 7,
          minWithdrawalAmount: minWithdrawalAmount ?? 50000,
        }
      })
    } else if (Object.keys(settingsData).length > 0) {
      settings = await prisma.escrowSettings.update({
        where: { id: settings.id },
        data: settingsData
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
        defaultEscrowDays: settings.defaultEscrowDays,
        starterEscrowDays: settings.starterEscrowDays,
        verifiedEscrowDays: settings.verifiedEscrowDays,
        premiumEscrowDays: settings.premiumEscrowDays,
        starterCommissionRate: settings.starterCommissionRate,
        verifiedCommissionRate: settings.verifiedCommissionRate,
        premiumCommissionRate: settings.premiumCommissionRate,
        autoReleaseEnabled: settings.autoReleaseEnabled,
        disputeResolutionDays: settings.disputeResolutionDays,
        minWithdrawalAmount: settings.minWithdrawalAmount,
      },
      reserve: {
        reservePercent: reserve.reservePercent,
        minReserve: reserve.minReserve,
        currency: reserve.currency,
        totalReserve: reserve.totalReserve,
        availableReserve: reserve.availableReserve,
        pendingRefunds: reserve.pendingRefunds,
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
