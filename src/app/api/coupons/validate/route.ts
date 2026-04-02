import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { checkRateLimit } from '@/lib/rate-limit'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Rate limit: 10 validations per minute per IP
const COUPON_VALIDATE_LIMIT = { maxRequests: 10, windowSeconds: 60 }

// Validate coupon
export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP (no auth required for validation, but rate-limited to prevent brute-force)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateLimit = await checkRateLimit('coupon_validate', ip, COUPON_VALIDATE_LIMIT.maxRequests, COUPON_VALIDATE_LIMIT.windowSeconds)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many coupon attempts. Please try again later.', retryAfter: rateLimit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    const body = await req.json()
    const { code, subtotal = 0, storeId, productId, categoryId, userId } = body

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
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

    if (coupon.minOrder && subtotal < toNum(coupon.minOrder)) {
      return NextResponse.json({
        error: `Minimum order of UGX ${toNum(coupon.minOrder).toLocaleString()} required`
      }, { status: 400 })
    }

    // Check per-user limit (if userId provided)
    if (userId && coupon.perUserLimit > 0) {
      const userUsageCount = await prisma.order.count({
        where: {
          couponId: coupon.id,
          userId: userId,
          paymentStatus: { in: ['PAID', 'COMPLETED'] },
        },
      })
      if (userUsageCount >= coupon.perUserLimit) {
        return NextResponse.json({
          error: `You have already used this coupon ${coupon.perUserLimit} time${coupon.perUserLimit > 1 ? 's' : ''}`
        }, { status: 400 })
      }
    }

    // Check forNewUsers restriction (if userId provided)
    if (userId && coupon.forNewUsers) {
      const userOrderCount = await prisma.order.count({
        where: { userId, paymentStatus: { in: ['PAID', 'COMPLETED'] } },
      })
      if (userOrderCount > 0) {
        return NextResponse.json({ error: 'This coupon is only available for new customers' }, { status: 400 })
      }
    }

    // Check product targeting (if productId provided)
    if (productId && coupon.forProducts) {
      try {
        const targetProducts: string[] = JSON.parse(coupon.forProducts)
        if (targetProducts.length > 0 && !targetProducts.includes(productId)) {
          return NextResponse.json({ error: 'This coupon is not valid for this product' }, { status: 400 })
        }
      } catch { /* invalid JSON — skip targeting check */ }
    }

    // Check category targeting (if categoryId provided)
    if (categoryId && coupon.forCategories) {
      try {
        const targetCategories: string[] = JSON.parse(coupon.forCategories)
        if (targetCategories.length > 0 && !targetCategories.includes(categoryId)) {
          return NextResponse.json({ error: 'This coupon is not valid for this category' }, { status: 400 })
        }
      } catch { /* invalid JSON — skip targeting check */ }
    }

    // Check store targeting (if storeId provided)
    if (storeId && coupon.forStores) {
      try {
        const targetStores: string[] = JSON.parse(coupon.forStores)
        if (targetStores.length > 0 && !targetStores.includes(storeId)) {
          return NextResponse.json({ error: 'This coupon is not valid for this store' }, { status: 400 })
        }
      } catch { /* invalid JSON — skip targeting check */ }
    }

    const couponValue = toNum(coupon.value)
    const maxDiscount = coupon.maxDiscount ? toNum(coupon.maxDiscount) : null

    // Handle FREE_SHIPPING
    if (coupon.type === 'FREE_SHIPPING') {
      return NextResponse.json({
        valid: true,
        coupon: { id: coupon.id, code: coupon.code, type: coupon.type, description: coupon.description },
        discount: 0,
        freeShipping: true,
      })
    }

    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = (subtotal * couponValue) / 100
      if (maxDiscount) discount = Math.min(discount, maxDiscount)
    } else if (coupon.type === 'FIXED') {
      discount = couponValue
    }

    // Cap discount to subtotal (FIXED can't exceed the order)
    discount = Math.min(discount, subtotal)

    // Apply maxDiscount cap for PERCENTAGE
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount
    }

    return NextResponse.json({
      valid: true,
      coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: couponValue, description: coupon.description },
      discount,
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
