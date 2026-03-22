import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Public order tracking
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orderNumber = searchParams.get('orderNumber')
    const email = searchParams.get('email')

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: 'Order number and email are required' },
        { status: 400 }
      )
    }

    // Find order with matching order number and user email
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        user: {
          email: email.toLowerCase(),
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        shippingName: true,
        shippingAddress: true,
        shippingCity: true,
        shippingRegion: true,
        shippingCountry: true,
        shippingPhone: true,
        busCompany: true,
        busNumberPlate: true,
        conductorPhone: true,
        pickupLocation: true,
        currency: true,
        total: true,
        estimatedDelivery: true,
        deliveredAt: true,
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            price: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error tracking order:', error)
    return NextResponse.json(
      { error: 'Failed to track order' },
      { status: 500 }
    )
  }
}
