import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// MTN Mobile Money Collection
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 5 payment attempts per minute per user
    const rateLimit = await checkRateLimit('payment_mtn', userId, RATE_LIMITS.PAYMENT_INIT.maxRequests, RATE_LIMITS.PAYMENT_INIT.windowSeconds)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Please try again later.', retryAfter: rateLimit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    const { orderId, phoneNumber } = await req.json()

    // Validate required fields
    if (!orderId || !phoneNumber) {
      return NextResponse.json({ error: 'Order ID and phone number are required' }, { status: 400 })
    }

    // Get order and verify ownership
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { Payment: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // SECURITY: Verify the authenticated user owns this order
    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Format phone number (256 for Uganda)
    let formattedPhone = phoneNumber.replace(/\+/g, '').replace(/^0/, '')
    if (!formattedPhone.startsWith('256')) {
      formattedPhone = '256' + formattedPhone
    }

    const apiKey = process.env.MTN_MOMO_API_KEY
    const userIdMomo = process.env.MTN_MOMO_USER_ID
    const environment = process.env.MTN_MOMO_ENVIRONMENT || 'sandbox'
    const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY

    const baseUrl = environment === 'production'
      ? 'https://momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com'

    // Create access token
    const basicAuth = Buffer.from(`${userIdMomo}:${apiKey}`).toString('base64')
    const tokenResponse = await fetch(`${baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Ocp-Apim-Subscription-Key': subscriptionKey!,
      },
    })
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Generate unique reference
    const referenceId = `${order.orderNumber}-${Date.now()}`

    // Request to pay
    const payResponse = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': environment === 'production' ? 'production' : 'sandbox',
        'Ocp-Apim-Subscription-Key': subscriptionKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: order.total.toString(),
        currency: 'UGX',
        externalId: order.orderNumber,
        payer: {
          partyIdType: 'MSISDN',
          partyId: formattedPhone.replace('256', ''),
        },
        payerMessage: `Payment for order ${order.orderNumber}`,
        payeeNote: 'DuukaAfrica order payment',
      }),
    })

    if (payResponse.status === 202) {
      // Update payment with reference
      await prisma.payment.update({
        where: { id: order.Payment?.id },
        data: {
          providerRef: referenceId,
          phone: formattedPhone,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Payment request sent. Please check your phone and authorize the payment.',
        referenceId,
      })
    } else {
      const errorData = await payResponse.json()
      return NextResponse.json({
        success: false,
        error: errorData.message || 'Failed to initiate MTN Mobile Money payment',
      }, { status: 400 })
    }
  } catch (error) {
    console.error('MTN MoMo error:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
