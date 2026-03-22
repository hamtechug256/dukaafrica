import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// MTN Mobile Money Collection
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, phoneNumber } = await req.json()

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    })

    if (!order) {
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
    const auth = Buffer.from(`${userIdMomo}:${apiKey}`).toString('base64')
    const tokenResponse = await fetch(`${baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
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
        where: { id: order.payment?.id },
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
