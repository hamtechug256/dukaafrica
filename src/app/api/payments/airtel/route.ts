import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Airtel Money Collection
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
      include: { Payment: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\+/g, '').replace(/^0/, '')
    if (!formattedPhone.startsWith('256')) {
      formattedPhone = '256' + formattedPhone
    }

    const apiKey = process.env.AIRTEL_MONEY_API_KEY
    const environment = process.env.AIRTEL_MONEY_ENVIRONMENT || 'sandbox'

    // Airtel Money API integration
    // Note: This is a simplified implementation
    // Full implementation requires Airtel Money merchant account

    const referenceId = `${order.orderNumber}-${Date.now()}`

    // For production, you would call Airtel's actual API
    // This is a placeholder that returns success for sandbox
    if (environment === 'sandbox') {
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
    }

    // Production implementation would go here
    return NextResponse.json({
      success: false,
      error: 'Airtel Money integration not configured for production',
    }, { status: 400 })
  } catch (error) {
    console.error('Airtel Money error:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
