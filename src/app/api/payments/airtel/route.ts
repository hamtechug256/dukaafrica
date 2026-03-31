import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Airtel Money Collection
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 5 payment attempts per minute per user
    const rateLimit = await checkRateLimit('payment_airtel', userId, RATE_LIMITS.PAYMENT_INIT.maxRequests, RATE_LIMITS.PAYMENT_INIT.windowSeconds)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Please try again later.', retryAfter: rateLimit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    const { orderId, phoneNumber } = await req.json()

    // Input validation
    if (!orderId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Order ID and phone number are required' },
        { status: 400 }
      )
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { Payment: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // SECURITY: Verify the order belongs to the authenticated user
    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user || order.userId !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\+/g, '').replace(/^0/, '')
    if (!formattedPhone.startsWith('256')) {
      formattedPhone = '256' + formattedPhone
    }

    const apiKey = process.env.AIRTEL_MONEY_API_KEY
    const environment = process.env.AIRTEL_MONEY_ENVIRONMENT || 'sandbox'

    const referenceId = `${order.orderNumber}-${Date.now()}`

    // SECURITY FIX: In sandbox mode, only proceed if explicitly enabled via env var.
    // Sandbox mode does NOT auto-approve payments — it creates a PENDING payment
    // that must be confirmed via the callback route, just like production.
    if (environment === 'sandbox') {
      if (process.env.AIRTEL_SANDBOX_MODE !== 'true') {
        return NextResponse.json(
          { error: 'Airtel Money sandbox mode is not enabled. Set AIRTEL_SANDBOX_MODE=true to test.' },
          { status: 400 }
        )
      }

      // Create a pending payment record (NOT auto-approved)
      await prisma.payment.update({
        where: { id: order.Payment?.id },
        data: {
          providerRef: referenceId,
          phone: formattedPhone,
          status: 'PENDING', // Explicitly pending — NOT auto-approved
        },
      })

      console.warn(`[AIRTEL] SANDBOX MODE: Payment ${referenceId} created as PENDING for order ${order.orderNumber}. Use /api/payments/airtel/callback to confirm.`)

      return NextResponse.json({
        success: true,
        message: 'Sandbox payment created (PENDING). Use the callback endpoint to confirm for testing.',
        referenceId,
        sandbox: true,
      })
    }

    // Production: Call Airtel Money API
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Airtel Money API key not configured' },
        { status: 500 }
      )
    }

    // Airtel Money DISBURSE API integration for production
    // Full implementation requires Airtel Money merchant account
    // The callback URL should be set in Airtel Money dashboard to:
    // {NEXT_PUBLIC_APP_URL}/api/payments/airtel/callback
    const airtelResponse = await fetch(
      'https://openapi.airtel.africa/merchant/v1/payments/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': 'UGX',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          reference: referenceId,
          transaction: {
            amount: order.total.toString(),
            country: 'UG',
            currency: 'UGX',
            id: referenceId,
          },
          subscriber: {
            country: 'UG',
            currency: 'UGX',
            msisdn: formattedPhone.replace('256', ''),
          },
        }),
      }
    )

    if (!airtelResponse.ok) {
      const errorData = await airtelResponse.json()
      console.error('[AIRTEL] Production API error:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Airtel Money payment initiation failed' },
        { status: 400 }
      )
    }

    const responseData = await airtelResponse.json()

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
      airtelTransactionId: responseData?.data?.transaction?.id,
    })
  } catch (error) {
    console.error('Airtel Money error:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
