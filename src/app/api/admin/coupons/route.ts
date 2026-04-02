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

const ALLOWED_COUPON_TYPES = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']

// GET /api/admin/coupons - List all coupons (with pagination)
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const search = searchParams.get('search')?.trim()

    const where: any = {}
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ])

    return NextResponse.json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
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

    if (!code || !type) {
      return NextResponse.json({ error: 'Code and type are required' }, { status: 400 })
    }

    // Validate coupon type
    if (!ALLOWED_COUPON_TYPES.includes(type)) {
      return NextResponse.json({ error: `Type must be one of: ${ALLOWED_COUPON_TYPES.join(', ')}` }, { status: 400 })
    }

    // FREE_SHIPPING doesn't need a value
    if (type !== 'FREE_SHIPPING' && value === undefined) {
      return NextResponse.json({ error: 'Value is required for PERCENTAGE and FIXED types' }, { status: 400 })
    }

    // Validate value for PERCENTAGE and FIXED
    if (type !== 'FREE_SHIPPING') {
      const numValue = parseFloat(value)
      if (isNaN(numValue) || numValue <= 0) {
        return NextResponse.json({ error: 'Value must be a positive number' }, { status: 400 })
      }
      if (type === 'PERCENTAGE' && numValue > 100) {
        return NextResponse.json({ error: 'Percentage value cannot exceed 100' }, { status: 400 })
      }
    }

    // Validate dates (both required)
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are both required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    if (end <= start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Sanitize code: strip spaces/special chars, uppercase, enforce length
    const sanitizedCode = code.toUpperCase().replace(/[^A-Z0-9_-]/g, '').substring(0, 30)
    if (sanitizedCode.length < 3) {
      return NextResponse.json({ error: 'Coupon code must be at least 3 characters (letters, numbers, hyphens, underscores)' }, { status: 400 })
    }

    // Check if coupon code exists
    const existing = await prisma.coupon.findUnique({
      where: { code: sanitizedCode },
    })

    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })
    }

    const numValue = type !== 'FREE_SHIPPING' ? parseFloat(value) : 0

    const coupon = await prisma.coupon.create({
      data: {
        code: sanitizedCode,
        description: description?.trim() || null,
        type,
        value: numValue,
        minOrder: minOrder !== undefined && minOrder !== null && minOrder !== '' ? parseFloat(minOrder) : null,
        maxDiscount: maxDiscount !== undefined && maxDiscount !== null && maxDiscount !== '' ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit !== undefined && usageLimit !== null && usageLimit !== '' ? parseInt(usageLimit) : null,
        perUserLimit: perUserLimit !== undefined && perUserLimit !== null ? parseInt(perUserLimit) : 1,
        startDate: start,
        endDate: end,
        forNewUsers: !!forNewUsers,
        forProducts: forProducts || null,
        forCategories: forCategories || null,
        forStores: forStores || null,
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

    // Validate type if changing
    if (data.type !== undefined && !ALLOWED_COUPON_TYPES.includes(data.type)) {
      return NextResponse.json({ error: `Type must be one of: ${ALLOWED_COUPON_TYPES.join(', ')}` }, { status: 400 })
    }

    // Check code uniqueness if updating code
    if (data.code !== undefined) {
      const sanitizedCode = data.code.toUpperCase().replace(/[^A-Z0-9_-]/g, '').substring(0, 30)
      const existing = await prisma.coupon.findFirst({
        where: { code: sanitizedCode, NOT: { id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })
      }
      data.code = sanitizedCode
    }

    const updateData: any = {}
    // Use !== undefined check instead of truthy to allow setting values to 0 or empty
    if (data.code !== undefined) updateData.code = data.code
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.type !== undefined) updateData.type = data.type
    if (data.value !== undefined) updateData.value = parseFloat(data.value)
    if (data.minOrder !== undefined) updateData.minOrder = data.minOrder !== null && data.minOrder !== '' ? parseFloat(data.minOrder) : null
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount !== null && data.maxDiscount !== '' ? parseFloat(data.maxDiscount) : null
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit !== null && data.usageLimit !== '' ? parseInt(data.usageLimit) : null
    if (data.perUserLimit !== undefined) updateData.perUserLimit = parseInt(data.perUserLimit)
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate)
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.forNewUsers !== undefined) updateData.forNewUsers = !!data.forNewUsers
    if (data.forProducts !== undefined) updateData.forProducts = data.forProducts || null
    if (data.forCategories !== undefined) updateData.forCategories = data.forCategories || null
    if (data.forStores !== undefined) updateData.forStores = data.forStores || null

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

// DELETE /api/admin/coupons - Soft-delete coupon (block if actively used)
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

    // Check usage before deleting
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      select: { id: true, usageCount: true, code: true },
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    if (coupon.usageCount > 0) {
      // Deactivate instead of delete to preserve order history integrity
      await prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: `Coupon "${coupon.code}" has been deactivated (has ${coupon.usageCount} existing uses)`,
        deactivated: true,
      })
    }

    await prisma.coupon.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, deactivated: false })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 })
  }
}
