import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// M-Pesa STK Push (Lipa Na M-Pesa)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 5 payment attempts per minute per user
    const rateLimit = await checkRateLimit('payment_mpesa', userId, RATE_LIMITS.PAYMENT_INIT.maxRequests, RATE_LIMITS.PAYMENT_INIT.windowSeconds)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Please try again later.', retryAfter: rateLimit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    const { orderId, phoneNumber } = await req.json()

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { Payment: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Format phone number (remove + and leading 0, add 254 for Kenya)
    let formattedPhone = phoneNumber.replace(/\+/g, '').replace(/^0/, '')
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone
    }

    // M-Pesa STK Push API call
    const consumerKey = process.env.MPESA_CONSUMER_KEY
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET
    const passkey = process.env.MPESA_PASSKEY
    const shortcode = process.env.MPESA_SHORTCODE || '174379'
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox'

    const baseUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

    // Get access token
    const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    })
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Generate password and timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

    // STK Push
    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(order.total.toNumber()),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/callback`,
        AccountReference: order.orderNumber,
        TransactionDesc: `Payment for order ${order.orderNumber}`,
      }),
    })

    const stkData = await stkResponse.json()

    if (stkData.ResponseCode === '0') {
      // Update payment with checkout request ID
      await prisma.payment.update({
        where: { id: order.Payment?.id },
        data: {
          providerRef: stkData.CheckoutRequestID,
          phone: formattedPhone,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'STK push sent. Please check your phone and enter M-Pesa PIN.',
        checkoutRequestId: stkData.CheckoutRequestID,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: stkData.errorMessage || 'Failed to initiate M-Pesa payment',
      }, { status: 400 })
    }
  } catch (error) {
    console.error('M-Pesa error:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
