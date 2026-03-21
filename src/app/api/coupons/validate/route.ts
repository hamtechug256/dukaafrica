import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Validate coupon
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code, subtotal, storeId, productId, categoryId } = body

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 })
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 })
    }

    const now = new Date()
    if (now < coupon.startDate || now > coupon.endDate) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 })
    }

    if (coupon.minOrder && subtotal < coupon.minOrder) {
      return NextResponse.json({
        error: `Minimum order of UGX ${coupon.minOrder.toLocaleString()} required`
      }, { status: 400 })
    }

    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = (subtotal * coupon.value) / 100
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
    } else if (coupon.type === 'FIXED') {
      discount = coupon.value
    } else if (coupon.type === 'FREE_SHIPPING') {
      return NextResponse.json({
        valid: true,
        coupon: { id: coupon.id, code: coupon.code, type: coupon.type, description: coupon.description },
        discount: 0,
        freeShipping: true,
      })
    }

    return NextResponse.json({
      valid: true,
      coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description },
      discount,
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
