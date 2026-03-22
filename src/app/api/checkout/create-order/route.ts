import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const { items, shippingAddress, deliveryOption, paymentMethod, subtotal, shipping, total } = body

    // Validate
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

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

    // Create order
    const orderNumber = generateOrderNumber()

    const order = await prisma.order.create({
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
        items: {
          create: items.map((item: any) => ({
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
        items: true,
      },
    })

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: dbUser.id,
        amount: total,
        currency: 'UGX',
        method: paymentMethod.type,
        provider: paymentMethod.provider,
        status: 'PENDING',
      },
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

    // For mobile money, return order and payment info
    return NextResponse.json({
      order,
      payment: {
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
