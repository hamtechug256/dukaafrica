import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Paystack webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const signature = req.headers.get('x-paystack-signature')

    // TODO: Verify signature for security
    // const hash = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!)
    //   .update(JSON.stringify(body))
    //   .digest('hex')
    // if (hash !== signature) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    // }

    const event = body.event
    const data = body.data

    console.log('Paystack webhook event:', event)

    switch (event) {
      case 'charge.success': {
        const reference = data.reference
        const orderId = reference.replace('DA-', '')

        // Update payment status
        const payment = await prisma.payment.findFirst({
          where: { orderId },
        })

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              providerRef: data.id.toString(),
              providerResponse: JSON.stringify(data),
              paidAt: new Date(),
            },
          })

          // Update order status
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'PAID',
              status: 'CONFIRMED',
            },
          })

          // Update product quantities and store stats
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { OrderItem: true },
          })

          if (order) {
            for (const item of order.OrderItem) {
              // Update product quantity
              await prisma.product.update({
                where: { id: item.productId },
                data: {
                  quantity: { decrement: item.quantity },
                  purchaseCount: { increment: item.quantity },
                },
              })

              // Update store sales
              await prisma.store.update({
                where: { id: item.storeId },
                data: {
                  totalSales: { increment: item.total },
                  totalOrders: { increment: 1 },
                },
              })
            }
          }
        }
        break
      }

      case 'charge.failed': {
        const reference = data.reference
        const orderId = reference.replace('DA-', '')

        await prisma.payment.updateMany({
          where: { orderId },
          data: {
            status: 'FAILED',
            providerResponse: JSON.stringify(data),
            failedAt: new Date(),
          },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
