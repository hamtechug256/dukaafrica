import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveCurrency, resolveCountry, getCurrencyForCountry } from '@/lib/currency'

// Helper to serialize Decimal values to numbers for JSON responses
function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Prisma.Decimal) return obj.toNumber() as unknown as T
  if (Array.isArray(obj)) return obj.map(serializeDecimal) as unknown as T
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeDecimal((obj as Record<string, unknown>)[key])
      }
    }
    return result as unknown as T
  }
  return obj
}

// Zod validation schema for order creation
const OrderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  name: z.string().min(1),
  variantName: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  storeId: z.string().min(1),
  storeName: z.string().min(1),
  image: z.string().optional(),
})

const ShippingAddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  country: z.string().min(1, 'Country is required'),
  region: z.string().min(1, 'Region is required'),
  city: z.string().min(1, 'City is required'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
})

const PaymentMethodSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['CARD', 'MOBILE_MONEY']),
  provider: z.string().min(1),
  label: z.string().min(1),
  mobileMoneyCode: z.string().optional(),
  icon: z.string().optional(),
})

const DeliveryOptionSchema = z.object({
  id: z.string().min(1),
})

const CouponSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  discount: z.number().nonnegative(),
  freeShipping: z.boolean().optional(),
})

const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: ShippingAddressSchema,
  deliveryOption: DeliveryOptionSchema,
  paymentMethod: PaymentMethodSchema,
  subtotal: z.number().positive(),
  shipping: z.number().nonnegative(),
  total: z.number().positive(),
  coupon: CouponSchema.optional(),
  buyerCountry: z.string().optional(),
  buyerCurrency: z.string().optional(),
  idempotencyKey: z.string().min(1).optional(),
})

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DA-${timestamp}-${random}`
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 10 orders per minute per user
    const rateLimit = await checkRateLimit('order_create', userId, RATE_LIMITS.ORDER_CREATE.maxRequests, RATE_LIMITS.ORDER_CREATE.windowSeconds)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many order attempts. Please try again later.', retryAfter: rateLimit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    const body = await req.json()

    // Validate input with Zod
    const validationResult = CreateOrderSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { items, shippingAddress, deliveryOption, paymentMethod, subtotal, shipping, total, coupon, buyerCountry, buyerCurrency, idempotencyKey } = validationResult.data

    // Idempotency: if a key is provided, check for an existing order
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findFirst({
        where: { orderNumber: `IDEM-${idempotencyKey}` },
        include: {
          Payment: { select: { id: true, amount: true, method: true, provider: true } },
        },
      })
      if (existingOrder) {
        const existingPayment = existingOrder.Payment?.[0]
        return NextResponse.json({
          order: serializeDecimal(existingOrder),
          payment: existingPayment
            ? { id: existingPayment.id, amount: existingPayment.amount.toNumber(), method: existingPayment.method, provider: existingPayment.provider }
            : null,
        })
      }
    }

    // Verify coupon exists early (fail fast before price verification)
    let couponDiscount = 0
    let couponFreeShipping = false
    let dbCoupon: any = null
    if (coupon) {
      dbCoupon = await prisma.coupon.findUnique({
        where: { id: coupon.id },
      })
      if (!dbCoupon || !dbCoupon.isActive) {
        return NextResponse.json({ error: 'Coupon is no longer valid' }, { status: 400 })
      }
      const now = new Date()
      if (now < dbCoupon.startDate || now > dbCoupon.endDate) {
        return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
      }
      if (dbCoupon.usageLimit && dbCoupon.usageCount >= dbCoupon.usageLimit) {
        return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
      }
    }

    // SECURITY FIX: Verify prices and stock against database
    const productIds = items.map(i => i.productId)
    const variantIds = items.map(i => i.variantId).filter((id): id is string => id !== undefined)

    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, status: true, currency: true, quantity: true, storeId: true, freeShipping: true, Store: { select: { id: true, country: true, commissionRate: true } } },
    })
    const productPriceMap = new Map(dbProducts.map(p => [p.id, { ...p, price: p.price.toNumber(), quantity: p.quantity, freeShipping: p.freeShipping }]))

    // Fetch variants if any
    const dbVariants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, price: true },
        })
      : []
    const variantPriceMap = new Map(dbVariants.map(v => [v.id, { ...v, price: v.price.toNumber() }]))

    let serverSubtotal = 0
    for (const item of items) {
      // Get the actual price from database
      const dbPrice = item.variantId
        ? variantPriceMap.get(item.variantId)?.price ?? productPriceMap.get(item.productId)?.price ?? 0
        : productPriceMap.get(item.productId)?.price ?? 0

      const dbProduct = productPriceMap.get(item.productId)
      if (!dbProduct || dbProduct.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'One or more products are not available' },
          { status: 400 }
        )
      }

      // SECURITY FIX: Validate stock quantity against database
      const availableStock = dbProduct.quantity
      if (item.quantity > availableStock) {
        return NextResponse.json(
          { error: `Insufficient stock for one or more items. Only ${availableStock} available.` },
          { status: 400 }
        )
      }

      // Use the DATABASE price (already converted to number), not the client-provided price
      serverSubtotal += dbPrice * item.quantity
    }

    // Calculate coupon discount now that serverSubtotal is known
    if (dbCoupon) {
      const couponValue = dbCoupon.value instanceof Prisma.Decimal ? dbCoupon.value.toNumber() : Number(dbCoupon.value)
      if (dbCoupon.type === 'PERCENTAGE') {
        couponDiscount = (serverSubtotal * couponValue) / 100
        if (dbCoupon.maxDiscount) {
          const maxDisc = dbCoupon.maxDiscount instanceof Prisma.Decimal ? dbCoupon.maxDiscount.toNumber() : Number(dbCoupon.maxDiscount)
          couponDiscount = Math.min(couponDiscount, maxDisc)
        }
      } else if (dbCoupon.type === 'FIXED') {
        couponDiscount = couponValue
      }
      // Cap discount to subtotal (prevent negative totals)
      couponDiscount = Math.min(couponDiscount, serverSubtotal)
      couponFreeShipping = dbCoupon.type === 'FREE_SHIPPING' || !!coupon?.freeShipping
    }

    // Calculate server-side total with coupon discount
    const discount = Math.round(couponDiscount) // Round to avoid Decimal precision issues

    // SECURITY FIX: Verify free shipping at product level.
    // A buyer cannot send shipping: 0 unless ALL products have freeShipping = true
    // or a coupon provides free shipping.
    const allProductsHaveFreeShipping = items.every(item => {
      const dbProduct = productPriceMap.get(item.productId)
      return dbProduct?.freeShipping === true
    })
    const serverFreeShipping = allProductsHaveFreeShipping || couponFreeShipping
    const effectiveShipping = serverFreeShipping ? 0 : shipping

    // SECURITY FIX: If buyer claims free shipping but products don't qualify, reject
    if (shipping === 0 && !serverFreeShipping) {
      return NextResponse.json(
        { error: 'Shipping fee cannot be zero. Please refresh and try again.' },
        { status: 400 }
      )
    }

    const serverTotal = serverSubtotal - discount + effectiveShipping

    // SECURITY FIX: Reject if client prices don't match server prices (within tolerance)
    // Note: tolerance is higher when a coupon is applied due to rounding differences
    const tolerance = coupon ? 200 : 100
    if (Math.abs(subtotal - serverSubtotal) > tolerance) {
      return NextResponse.json(
        {
          error: 'Price mismatch detected. Please refresh and try again.',
          details: { clientSubtotal: subtotal, serverSubtotal },
        },
        { status: 400 }
      )
    }

    if (Math.abs(total - serverTotal) > tolerance) {
      return NextResponse.json(
        {
          error: 'Total mismatch detected. Please refresh and try again.',
          details: { clientTotal: total, serverTotal },
        },
        { status: 400 }
      )
    }

    // Use server-verified prices (already converted to number)
    const verifiedItems = items.map(item => {
      const dbPrice = item.variantId
        ? variantPriceMap.get(item.variantId)?.price ?? productPriceMap.get(item.productId)?.price ?? 0
        : productPriceMap.get(item.productId)?.price ?? 0
      return {
        ...item,
        price: dbPrice,
        total: dbPrice * item.quantity,
      }
    })

    // Get or create user in database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName,
          lastName: user.lastName,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
          avatar: user.imageUrl,
          role: 'BUYER',
        },
      })
    }

    // Resolve currency and country from user context or shipping address — never hardcode
    const orderCurrency = resolveCurrency(buyerCurrency || dbUser?.currency, shippingAddress?.country || dbUser?.country)
    const orderBuyerCountry = resolveCountry(buyerCountry || shippingAddress?.country || dbUser?.country)

    // Generate unique order number (use idempotency key if provided)
    const orderNumber = idempotencyKey ? `IDEM-${idempotencyKey}` : generateOrderNumber()

    // Use transaction for atomic order creation
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: dbUser!.id,
          
          // Shipping address
          shippingName: shippingAddress.fullName,
          shippingPhone: shippingAddress.phone,
          shippingCountry: shippingAddress.country,
          shippingRegion: shippingAddress.region,
          shippingCity: shippingAddress.city,
          shippingAddress: shippingAddress.addressLine1 + (shippingAddress.addressLine2 ? `, ${shippingAddress.addressLine2}` : ''),
          shippingPostal: shippingAddress.postalCode,
          
          // SECURITY FIX: Use server-verified prices
          subtotal: serverSubtotal,
          shippingFee: effectiveShipping,
          tax: 0,
          discount,
          couponId: coupon?.id || null,
          couponCode: coupon?.code || null,
          couponDiscount: discount,
          total: serverTotal,
          currency: orderCurrency,
          
          // Delivery
          deliveryMethod: deliveryOption.id.toUpperCase(),
          
          // Buyer/Seller country for commission & shipping calculations
          buyerCountry: orderBuyerCountry,
          sellerCountry: (() => {
            const firstProduct = productPriceMap.get(items[0].productId)
            return firstProduct?.Store?.country || orderBuyerCountry
          })(),
          
          // Payment — save the user-friendly label (e.g. 'MTN Mobile Money', 'Visa / Mastercard')
          // The Payment.method field stores the raw type for internal use
          paymentMethod: paymentMethod.label || paymentMethod.type,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          
          // Store - derive from the first item's storeId
          storeId: items[0]?.storeId || null,
          
          // Items - using verified prices from database
          OrderItem: {
            create: verifiedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.name,
              variantName: item.variantName,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              storeId: item.storeId,
              storeName: item.storeName,
              productImage: item.image,
            })),
          },
        },
        include: {
          OrderItem: true,
        },
      })

      // Stock reservation: decrement inventory atomically per item
      for (const item of verifiedItems) {
        const { count: productUpdated } = await tx.product.updateMany({
          where: { id: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        })
        if (productUpdated === 0) {
          throw new Error(`Insufficient stock for product ${item.productId}. Please refresh and try again.`)
        }
        // Handle variant stock if applicable
        if (item.variantId) {
          const { count: variantUpdated } = await tx.productVariant.updateMany({
            where: { id: item.variantId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          })
          if (variantUpdated === 0) {
            throw new Error(`Insufficient stock for variant ${item.variantId}. Please refresh and try again.`)
          }
        }
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          userId: dbUser!.id,
          amount: serverTotal,
          currency: orderCurrency,
          method: paymentMethod.type,
          provider: paymentMethod.provider,
          phone: paymentMethod.mobileMoneyCode || null,
          status: 'PENDING',
        },
      })

      // NOTE: Coupon usage count is incremented in the IPN COMPLETED handler
      // (not here) to prevent wasting coupon slots on unpaid orders.

      return { order, payment }
    })

    const { order, payment } = result

    // Return order and payment info (Pesapal initialization is done from the checkout page)
    return NextResponse.json({
      order: serializeDecimal(order),
      payment: {
        id: payment.id,
        amount: serverTotal,
        method: paymentMethod.type,
        provider: paymentMethod.provider,
      },
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
