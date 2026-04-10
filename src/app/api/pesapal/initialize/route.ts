/**
 * API: Initialize Pesapal Payment
 *
 * POST /api/pesapal/initialize
 *
 * Creates a payment order with Pesapal and returns the redirect URL
 * for the buyer to complete payment on Pesapal's hosted page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { pesapalClient, generateTransactionReference, PesapalCurrency, getCredentials } from '@/lib/pesapal/client'
import { calculatePaymentBreakdown } from '@/lib/payment-split'
import { Country, Currency } from '@/lib/currency'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      orderId,
      customerEmail,
      customerPhone,
      customerName,
    } = body

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        OrderItem: {
          include: {
            Product: {
              include: {
                Store: true
              }
            }
          }
        },
        Store: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify user owns this order
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || order.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Store lookup - prefer OrderItem.Product.Store over order.Store
    const firstItemWithStore = order.OrderItem.find(item => item.Product?.Store)
    const store = firstItemWithStore?.Product?.Store || order.Store

    // Generate a unique order tracking ID for Pesapal
    const orderTrackingId = generateTransactionReference('DUKA')

    // Calculate payment breakdown
    const paymentBreakdown = await calculatePaymentBreakdown({
      productPrice: toNum(order.subtotal),
      sellerCurrency: order.currency as Currency,
      sellerCountry: order.sellerCountry as Country,
      sellerCommissionRate: toNum(store?.commissionRate),
      buyerCurrency: order.currency as Currency,
      buyerCountry: order.buyerCountry as Country,
      productWeightKg: order.OrderItem.reduce((sum, item) => {
        return sum + (item.Product.weight || 1) * item.quantity
      }, 0),
    })

    // Build Pesapal order submission request
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const { ipnId } = await getCredentials()
    if (!ipnId) {
      return NextResponse.json(
        { error: 'IPN not configured. Please set PESAPAL_IPN_ID or register an IPN URL in Pesapal dashboard.' },
        { status: 500 }
      )
    }
    const pesapalOrderRequest = {
      id: orderTrackingId,
      currency: order.currency as PesapalCurrency,
      amount: toNum(order.total),
      description: `Order ${order.orderNumber}`,
      callback_url: `${origin}/checkout/success?orderId=${orderId}`,
      notification_id: ipnId,
      billing_address: {
        email_address: customerEmail || user.email || '',
        phone_number: customerPhone || '',
        first_name: customerName?.split(' ')[0] || user.name?.split(' ')[0] || '',
        last_name: customerName?.split(' ').slice(1).join(' ') || user.name?.split(' ').slice(1).join(' ') || '',
        country_code: (order.buyerCountry === 'UGANDA' ? 'UG'
          : order.buyerCountry === 'KENYA' ? 'KE'
          : order.buyerCountry === 'TANZANIA' ? 'TZ'
          : order.buyerCountry === 'RWANDA' ? 'RW' : 'UG'),
      },
    }

    // Submit order to Pesapal
    const response = await pesapalClient.submitOrder(pesapalOrderRequest)

    if (response.error || response.status !== '200') {
      throw new Error(response.error || 'Failed to submit Pesapal order')
    }

    // Update order with payment reference (the Pesapal order tracking ID)
    // Also update the existing Payment record (created by create-order) with Pesapal details
    const payment = await prisma.payment.findUnique({
      where: { orderId: order.id }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment record not found for this order' },
        { status: 404 }
      )
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { paymentRef: orderTrackingId }
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          // Don't overwrite method — it was set correctly in create-order
          // (e.g. 'CARD' for Visa/Mastercard, 'MOBILE_MONEY' for mobile money)
          provider: 'PESAPAL',
          reference: orderTrackingId,
          sellerAmount: paymentBreakdown.sellerTotalEarnings,
          sellerCurrency: order.currency,
          platformAmount: paymentBreakdown.platformTotalEarnings,
          platformCurrency: order.currency,
        }
      })
    ])

    return NextResponse.json({
      success: true,
      paymentLink: response.redirect_url,
      orderTrackingId,
      merchantReference: response.merchant_reference
    })

  } catch (error) {
    console.error('Pesapal payment initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
