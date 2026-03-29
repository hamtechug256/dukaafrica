/**
 * API: Platform Escrow Settings (Legacy Endpoint)
 * 
 * GET/PUT /api/admin/escrow-settings
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

// Default settings to return if database tables don't exist
function getDefaultSettings() {
  return {
    settings: {
      defaultEscrowDays: 7,
      starterEscrowDays: 7,
      verifiedEscrowDays: 5,
      premiumEscrowDays: 3,
      starterCommissionRate: 15,
      verifiedCommissionRate: 10,
      premiumCommissionRate: 8,
      autoReleaseEnabled: true,
      disputeResolutionDays: 7,
      minWithdrawalAmount: 50000,
    },
    reserve: {
      reservePercent: 10,
      minReserve: 500000,
      currency: 'UGX',
      totalReserve: 0,
      availableReserve: 0,
      pendingRefunds: 0,
    }
  }
}

// Get escrow settings
export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Try to get escrow settings from database
    let settings: Awaited<ReturnType<typeof prisma.escrowSettings.findFirst>> = null
    try {
      settings = await prisma.escrowSettings.findFirst()
    } catch {
      // Table might not exist yet - return defaults
      return NextResponse.json(getDefaultSettings())
    }

    // Try to get platform reserve
    let reserve: Awaited<ReturnType<typeof prisma.platformReserve.findFirst>> = null
    try {
      reserve = await prisma.platformReserve.findFirst()
    } catch {
      // Table doesn't exist
    }

    // Return settings
    return NextResponse.json({
      settings: settings ? {
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
      } : getDefaultSettings().settings,
      reserve: reserve ? {
        reservePercent: reserve.reservePercent,
        minReserve: reserve.minReserve,
        currency: reserve.currency,
        totalReserve: reserve.totalReserve,
        availableReserve: reserve.availableReserve,
        pendingRefunds: reserve.pendingRefunds,
      } : getDefaultSettings().reserve
    })
  } catch (error) {
    console.error('Error fetching escrow settings:', error)
    return NextResponse.json(getDefaultSettings())
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

    // Try to update/create platform reserve
    let reserve: Awaited<ReturnType<typeof prisma.platformReserve.findFirst>> = null
    try {
      reserve = await prisma.platformReserve.findFirst()
      
      if (body.reservePercent !== undefined || body.minReserve !== undefined) {
        if (reserve) {
          reserve = await prisma.platformReserve.update({
            where: { id: reserve.id },
            data: {
              ...(body.reservePercent !== undefined && { reservePercent: body.reservePercent }),
              ...(body.minReserve !== undefined && { minReserve: body.minReserve }),
            }
          })
        } else {
          reserve = await prisma.platformReserve.create({
            data: {
              totalReserve: 0,
              availableReserve: 0,
              pendingRefunds: 0,
              currency: 'UGX',
              reservePercent: body.reservePercent ?? 10,
              minReserve: body.minReserve ?? 500000,
            }
          })
        }
      }
    } catch {
      // Table doesn't exist
    }

    // Try to update/create escrow settings
    let settings: Awaited<ReturnType<typeof prisma.escrowSettings.findFirst>> = null
    try {
      settings = await prisma.escrowSettings.findFirst()
      
      const updateData: Record<string, unknown> = {}
      const fields = [
        'defaultEscrowDays', 'starterEscrowDays', 'verifiedEscrowDays', 'premiumEscrowDays',
        'starterCommissionRate', 'verifiedCommissionRate', 'premiumCommissionRate',
        'autoReleaseEnabled', 'disputeResolutionDays', 'minWithdrawalAmount'
      ]
      
      for (const field of fields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field]
        }
      }

      if (settings && Object.keys(updateData).length > 0) {
        settings = await prisma.escrowSettings.update({
          where: { id: settings.id },
          data: updateData
        })
      } else if (!settings) {
        settings = await prisma.escrowSettings.create({
          data: {
            defaultEscrowDays: body.defaultEscrowDays ?? 7,
            starterEscrowDays: body.starterEscrowDays ?? 7,
            verifiedEscrowDays: body.verifiedEscrowDays ?? 5,
            premiumEscrowDays: body.premiumEscrowDays ?? 3,
            starterCommissionRate: body.starterCommissionRate ?? 15,
            verifiedCommissionRate: body.verifiedCommissionRate ?? 10,
            premiumCommissionRate: body.premiumCommissionRate ?? 8,
            autoReleaseEnabled: body.autoReleaseEnabled ?? true,
            autoReleaseHour: 0,
            disputeResolutionDays: body.disputeResolutionDays ?? 7,
            minWithdrawalAmount: body.minWithdrawalAmount ?? 50000,
          }
        })
      }
    } catch {
      // Table doesn't exist
    }

    // Log the change
    try {
      await prisma.securityLog.create({
        data: {
          type: 'ESCROW_SETTINGS_UPDATED',
          identifier: admin.id,
          details: `Admin ${admin.id} updated escrow settings`,
        }
      })
    } catch {
      // Ignore
    }

    return NextResponse.json({
      success: true,
      settings: settings ? {
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
      } : getDefaultSettings().settings,
      reserve: reserve ? {
        reservePercent: reserve.reservePercent,
        minReserve: reserve.minReserve,
        currency: reserve.currency,
        totalReserve: reserve.totalReserve,
        availableReserve: reserve.availableReserve,
        pendingRefunds: reserve.pendingRefunds,
      } : getDefaultSettings().reserve
    })
  } catch (error) {
    console.error('Error updating escrow settings:', error)
    return NextResponse.json({ error: 'Failed to update escrow settings' }, { status: 500 })
  }
}
