import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// M-Pesa Callback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('M-Pesa callback:', JSON.stringify(body, null, 2))

    const { Body } = body
    const { stkCallback } = Body
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    // Find payment by checkout request ID
    const payment = await prisma.payment.findFirst({
      where: { providerRef: CheckoutRequestID },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (ResultCode === 0) {
      // Payment successful
      const metadata = CallbackMetadata?.Item || []
      const mpesaReceiptNumber = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value
      const transactionDate = metadata.find((i: any) => i.Name === 'TransactionDate')?.Value
      const amount = metadata.find((i: any) => i.Name === 'Amount')?.Value

      // Update payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          reference: mpesaReceiptNumber,
          providerResponse: JSON.stringify(body),
          paidAt: new Date(),
        },
      })

      // Update order
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentRef: mpesaReceiptNumber,
        },
      })

      // Update product quantities
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: { items: true },
      })

      if (order) {
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantity: { decrement: item.quantity },
              purchaseCount: { increment: item.quantity },
            },
          })

          await prisma.store.update({
            where: { id: item.storeId },
            data: {
              totalSales: { increment: item.total },
              totalOrders: { increment: 1 },
            },
          })
        }
      }
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          providerResponse: JSON.stringify(body),
          failedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('M-Pesa callback error:', error)
    return NextResponse.json({ error: 'Callback error' }, { status: 500 })
  }
}
