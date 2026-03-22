import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/admin/coupons - List all coupons
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Check if coupon code exists
    const existing = await prisma.coupon.findUnique({
      where: { code },
    })

    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        type,
        value: parseFloat(value),
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
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 })
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
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
