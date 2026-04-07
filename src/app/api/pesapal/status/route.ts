/**
 * API: Pesapal Transaction Status Polling
 *
 * GET /api/pesapal/status?orderTrackingId=xxx
 *
 * Allows the frontend to poll the status of a Pesapal transaction.
 * Useful as a fallback when the IPN hasn't arrived yet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pesapalClient } from '@/lib/pesapal/client'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderTrackingId = searchParams.get('orderTrackingId')

    if (!orderTrackingId) {
      return NextResponse.json(
        { error: 'orderTrackingId is required' },
        { status: 400 }
      )
    }

    // Verify the user owns this payment
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 403 }
      )
    }

    const payment = await prisma.payment.findFirst({
      where: {
        reference: orderTrackingId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        orderId: true,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // If already resolved locally, return that status immediately
    if (payment.status === 'PAID' || payment.status === 'FAILED' || payment.status === 'CANCELLED') {
      return NextResponse.json({
        status: payment.status,
        resolvedLocally: true,
      })
    }

    // Otherwise, poll Pesapal for the latest status
    const transactionStatus = await pesapalClient.getTransactionStatus(orderTrackingId)

    return NextResponse.json({
      status: transactionStatus.transaction_status,
      merchantReference: transactionStatus.merchant_reference,
      paymentMethod: transactionStatus.payment_method,
      paymentAccount: transactionStatus.payment_account,
      paymentReference: transactionStatus.payment_reference,
      amount: transactionStatus.amount,
      currency: transactionStatus.currency,
      resolvedLocally: false,
    })

  } catch (error) {
    console.error('Pesapal status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check transaction status' },
      { status: 500 }
    )
  }
}
