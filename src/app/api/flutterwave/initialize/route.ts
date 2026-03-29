/**
 * API: Initialize Flutterwave Payment
 * 
 * POST /api/flutterwave/initialize
 * 
 * Creates a payment request with split payment configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  flutterwaveClient,
  generateTransactionReference,
  CURRENCY_TO_FW_CURRENCY,
  MOBILE_MONEY_METHODS,
} from '@/lib/flutterwave/client'
import { calculatePaymentBreakdown } from '@/lib/payment-split'
import { Country, Currency } from '@/lib/currency'

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

    // Get seller's Flutterwave subaccount
    const store = order.Store
    if (!store?.flutterwaveSubaccountId) {
      return NextResponse.json(
        { error: 'Seller payment account not configured' },
        { status: 400 }
      )
    }

    // Generate transaction reference
    const txRef = generateTransactionReference()

    // Calculate payment breakdown
    const paymentBreakdown = await calculatePaymentBreakdown({
      productPrice: order.subtotal,
      sellerCurrency: order.currency as Currency,
      sellerCountry: order.sellerCountry as Country,
      sellerCommissionRate: store.commissionRate,
      buyerCurrency: order.currency as Currency,
      buyerCountry: order.buyerCountry as Country,
      productWeightKg: order.OrderItem.reduce((sum, item) => {
        return sum + (item.Product.weight || 1) * item.quantity
      }, 0),
      sellerSubaccountId: store.flutterwaveSubaccountId
    })

    // Build Flutterwave payment request
    const paymentRequest = {
      tx_ref: txRef,
      amount: order.total,
      currency: CURRENCY_TO_FW_CURRENCY[order.currency],
      customer: {
        email: customerEmail || user.email,
        phone_number: customerPhone,
        name: customerName || user.name || 'Customer'
      },
      customizations: {
        title: 'DuukaAfrica',
        description: `Order ${order.orderNumber}`,
        logo: 'https://duukaafrica.com/logo.png'
      },
      subaccounts: [
        {
          id: store.flutterwaveSubaccountId,
          transaction_charge_type: 'flat' as const,
          transaction_charge: paymentBreakdown.sellerTotalEarnings
        }
      ],
      meta: {
        order_id: order.id,
        order_number: order.orderNumber,
        buyer_country: order.buyerCountry,
        seller_country: order.sellerCountry,
        platform_commission: paymentBreakdown.platformTotalEarnings,
        shipping_zone: order.shippingZoneType || ''
      }
    }

    // Initialize payment with Flutterwave
    const response = await flutterwaveClient.initializePayment(paymentRequest)

    if (response.status !== 'success') {
      throw new Error(response.message)
    }

    // Update order with payment reference
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentRef: txRef
      }
    })

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: user.id,
        amount: order.total,
        currency: order.currency,
        method: 'MOBILE_MONEY',
        provider: 'FLUTTERWAVE',
        sellerAmount: paymentBreakdown.sellerTotalEarnings,
        sellerCurrency: order.currency,
        platformAmount: paymentBreakdown.platformTotalEarnings,
        platformCurrency: order.currency,
        reference: txRef,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      paymentLink: response.data.link,
      txRef,
      transactionId: response.data.id
    })

  } catch (error) {
    console.error('Payment initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
