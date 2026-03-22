/**
 * API: Update Shipping Rate
 * 
 * PATCH /api/admin/shipping/rates/[id] - Update a shipping rate
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { baseFee, perKgFee, crossBorderFee, platformMarkupPercent, isActive } = body

    const rate = await prisma.shippingRate.update({
      where: { id },
      data: {
        ...(baseFee !== undefined && { baseFee }),
        ...(perKgFee !== undefined && { perKgFee }),
        ...(crossBorderFee !== undefined && { crossBorderFee }),
        ...(platformMarkupPercent !== undefined && { platformMarkupPercent }),
        ...(isActive !== undefined && { isActive }),
      }
    })

    return NextResponse.json({ rate })

  } catch (error) {
    console.error('Error updating shipping rate:', error)
    return NextResponse.json({ error: 'Failed to update shipping rate' }, { status: 500 })
  }
}
