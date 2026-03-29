import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

/**
 * Check if user has admin access
 */
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

// GET /api/admin/coupons - List all coupons
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Error fetching coupons:', error)
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
  }
}

// POST /api/admin/coupons - Create coupon
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      code,
      description,
      type,
      value,
      minOrder,
      maxDiscount,
      usageLimit,
      perUserLimit,
      startDate,
      endDate,
      forNewUsers,
      forProducts,
      forCategories,
      forStores,
    } = body

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Code, type, and value are required' }, { status: 400 })
    }

    // Validate coupon type
    if (!['PERCENTAGE', 'FIXED'].includes(type)) {
      return NextResponse.json({ error: 'Type must be PERCENTAGE or FIXED' }, { status: 400 })
    }

    // Validate value
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json({ error: 'Value must be a positive number' }, { status: 400 })
    }

    // Percentage coupons should be 0-100
    if (type === 'PERCENTAGE' && numValue > 100) {
      return NextResponse.json({ error: 'Percentage value cannot exceed 100' }, { status: 400 })
    }

    // Validate dates
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (end <= start) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
      }
    }

    // Check if coupon code exists
    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        type,
        value: numValue,
        minOrder: minOrder ? parseFloat(minOrder) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        perUserLimit: parseInt(perUserLimit) || 1,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        forNewUsers: forNewUsers || false,
        forProducts,
        forCategories,
        forStores,
      },
    })

    return NextResponse.json({ coupon })
  } catch (error) {
    console.error('Error creating coupon:', error)
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 })
  }
}

// PATCH /api/admin/coupons - Update coupon
export async function PATCH(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    // Validate if updating value
    if (data.value !== undefined) {
      const numValue = parseFloat(data.value)
      if (isNaN(numValue) || numValue <= 0) {
        return NextResponse.json({ error: 'Value must be a positive number' }, { status: 400 })
      }
      if (data.type === 'PERCENTAGE' && numValue > 100) {
        return NextResponse.json({ error: 'Percentage value cannot exceed 100' }, { status: 400 })
      }
    }

    const updateData: any = { ...data }
    if (data.value) updateData.value = parseFloat(data.value)
    if (data.minOrder) updateData.minOrder = parseFloat(data.minOrder)
    if (data.maxDiscount) updateData.maxDiscount = parseFloat(data.maxDiscount)
    if (data.usageLimit) updateData.usageLimit = parseInt(data.usageLimit)
    if (data.perUserLimit) updateData.perUserLimit = parseInt(data.perUserLimit)
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ coupon })
  } catch (error) {
    console.error('Error updating coupon:', error)
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 })
  }
}

// DELETE /api/admin/coupons - Delete coupon
export async function DELETE(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
    }

    await prisma.coupon.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 })
  }
}
