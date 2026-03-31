import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

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
  type: z.enum(['CARD', 'MOBILE_MONEY']),
  provider: z.string().min(1),
})

const DeliveryOptionSchema = z.object({
  id: z.string().min(1),
})

const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: ShippingAddressSchema,
  deliveryOption: DeliveryOptionSchema,
  paymentMethod: PaymentMethodSchema,
  subtotal: z.number().positive(),
  shipping: z.number().nonnegative(),
  total: z.number().positive(),
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

    const body = await req.json()

    // Validate input with Zod
    const validationResult = CreateOrderSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { items, shippingAddress, deliveryOption, paymentMethod, subtotal, shipping, total } = validationResult.data

    // SECURITY FIX: Verify prices against database
    const productIds = items.map(i => i.productId)
    const variantIds = items.filter(i => i.variantId).map(i => i.variantId)

    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, status: true, currency: true },
    })
    const productPriceMap = new Map(dbProducts.map(p => [p.id, p]))

    // Fetch variants if any
    const dbVariants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, price: true },
        })
      : []
    const variantPriceMap = new Map(dbVariants.map(v => [v.id, v]))

    let serverSubtotal = 0
    for (const item of items) {
      // Get the actual price from database
      const dbPrice = item.variantId
        ? variantPriceMap.get(item.variantId)?.price ?? productPriceMap.get(item.productId)?.price ?? 0
        : productPriceMap.get(item.productId)?.price ?? 0

      const dbProduct = productPriceMap.get(item.productId)
      if (!dbProduct || dbProduct.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Product ${item.productId} is not available` },
          { status: 400 }
        )
      }

      // Use the DATABASE price, not the client-provided price
      serverSubtotal += dbPrice * item.quantity
    }

    // Calculate server-side shipping (simple estimation)
    // In production, this would call the shipping calculator API
    const serverTotal = serverSubtotal + shipping

    // SECURITY FIX: Reject if client prices don't match server prices (within tolerance)
    if (Math.abs(subtotal - serverSubtotal) > 100) { // 100 currency units tolerance
      return NextResponse.json(
        {
          error: 'Price mismatch detected. Please refresh and try again.',
          details: { clientSubtotal: subtotal, serverSubtotal },
        },
        { status: 400 }
      )
    }

    if (Math.abs(total - serverTotal) > 100) {
      return NextResponse.json(
        {
          error: 'Total mismatch detected. Please refresh and try again.',
          details: { clientTotal: total, serverTotal },
        },
        { status: 400 }
      )
    }

    // Use server-verified prices
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

    // Generate unique order number
    const orderNumber = generateOrderNumber()

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
          shippingFee: shipping,
          tax: 0,
          discount: 0,
          total: serverTotal,
          currency: dbUser!.currency || 'UGX',
          
          // Delivery
          deliveryMethod: deliveryOption.id.toUpperCase(),
          
          // Payment
          paymentMethod: paymentMethod.type,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          
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

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          userId: dbUser!.id,
          amount: serverTotal,
          currency: dbUser!.currency || 'UGX',
          method: paymentMethod.type,
          provider: paymentMethod.provider,
          status: 'PENDING',
        },
      })

      return { order, payment }
    })

    const { order, payment } = result

    // If card payment, initialize Paystack transaction
    if (paymentMethod.type === 'CARD' && paymentMethod.provider === 'PAYSTACK') {
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.emailAddresses[0]?.emailAddress,
          amount: serverTotal * 100, // SECURITY FIX: Use server-verified total
          reference: `DA-${order.id}`,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: dbUser.id,
          },
        }),
      })

      const paystackData = await paystackResponse.json()

      if (paystackData.status) {
        // Update payment with reference
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            reference: paystackData.data.reference,
            providerRef: paystackData.data.access_code,
          },
        })

        return NextResponse.json({
          order,
          payment: {
            id: payment.id,
            authorization_url: paystackData.data.authorization_url,
            reference: paystackData.data.reference,
          },
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to initialize payment' },
          { status: 500 }
        )
      }
    }

    // For mobile money, return order and payment info (using server-verified total)
    return NextResponse.json({
      order,
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
