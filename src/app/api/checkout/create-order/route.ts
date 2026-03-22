import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const AddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  region: z.string().min(1, 'Region is required'),
  city: z.string().min(1, 'City is required'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
})

const DeliveryOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().min(0),
  estimatedDays: z.string().optional(),
})

const PaymentMethodSchema = z.object({
  type: z.enum(['CARD', 'MPESA', 'MTN', 'AIRTEL', 'FLUTTERWAVE', 'PAYSTACK']),
  provider: z.enum(['PAYSTACK', 'FLUTTERWAVE', 'MPESA', 'MTN', 'AIRTEL']).optional(),
  phone: z.string().optional(),
})

const CartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string(),
  variantName: z.string().optional(),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
  storeId: z.string(),
  storeName: z.string(),
  image: z.string().optional(),
})

const CreateOrderSchema = z.object({
  items: z.array(CartItemSchema).min(1, 'At least one item is required'),
  shippingAddress: AddressSchema,
  deliveryOption: DeliveryOptionSchema,
  paymentMethod: PaymentMethodSchema,
  subtotal: z.number().min(0),
  shipping: z.number().min(0),
  total: z.number().min(0),
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

    // Create order and payment in a transaction for data consistency
    const orderNumber = generateOrderNumber()
    
    const { order, payment } = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: dbUser.id,
          
          // Shipping address
          shippingName: shippingAddress.fullName,
          shippingPhone: shippingAddress.phone,
          shippingCountry: shippingAddress.country,
          shippingRegion: shippingAddress.region,
          shippingCity: shippingAddress.city,
          shippingAddress: shippingAddress.addressLine1 + (shippingAddress.addressLine2 ? `, ${shippingAddress.addressLine2}` : ''),
          shippingPostal: shippingAddress.postalCode,
          
          // Pricing
          subtotal,
          shippingFee: shipping,
          tax: 0,
          discount: 0,
          total,
          currency: 'UGX',
          
          // Delivery
          deliveryMethod: deliveryOption.id.toUpperCase(),
          
          // Payment
          paymentMethod: paymentMethod.type,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          
          // Items
          OrderItem: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.name,
              variantName: item.variantName,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
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
      const newPayment = await tx.payment.create({
        data: {
          orderId: newOrder.id,
          userId: dbUser.id,
          amount: total,
          currency: 'UGX',
          method: paymentMethod.type,
          provider: paymentMethod.provider,
          status: 'PENDING',
        },
      })

      return { order: newOrder, payment: newPayment }
    })

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
          amount: total * 100, // Convert to kobo
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
          Payment: {
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

    // For mobile money, return order and payment info
    return NextResponse.json({
      order,
      Payment: {
        id: payment.id,
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
