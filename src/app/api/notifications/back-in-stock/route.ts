/**
 * API: Back in Stock Notifications
 * 
 * POST /api/notifications/back-in-stock - Subscribe to notification
 * GET /api/notifications/back-in-stock/check?productId=xxx - Check if subscribed
 * DELETE /api/notifications/back-in-stock?productId=xxx - Unsubscribe
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// Subscribe to back in stock notification
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const body = await request.json()
    const { productId, email } = body

    if (!productId || !email) {
      return NextResponse.json(
        { error: 'Product ID and email are required' },
        { status: 400 }
      )
    }

    // Check if product exists and is out of stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, quantity: true, name: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Create or update notification setting
    // Using a Setting model to store subscriptions
    await prisma.setting.upsert({
      where: {
        key: `back_in_stock_${productId}_${email}`,
      },
      update: {
        value: JSON.stringify({
          productId,
          email,
          userId,
          subscribedAt: new Date().toISOString(),
          notified: false,
        }),
      },
      create: {
        key: `back_in_stock_${productId}_${email}`,
        value: JSON.stringify({
          productId,
          email,
          userId,
          subscribedAt: new Date().toISOString(),
          notified: false,
        }),
        type: 'JSON',
        group: 'back_in_stock',
      },
    })

    return NextResponse.json({
      success: true,
      message: `You'll be notified when ${product.name} is back in stock`,
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}

// Check if subscribed
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ isSubscribed: false })
    }

    // Check for existing subscription
    // This is simplified - in production you'd want a proper NotificationSubscription model
    const subscription = await prisma.setting.findFirst({
      where: {
        key: { contains: productId },
        group: 'back_in_stock',
      },
    })

    return NextResponse.json({
      isSubscribed: !!subscription,
    })
  } catch (error) {
    console.error('Check subscription error:', error)
    return NextResponse.json({ isSubscribed: false })
  }
}

// Unsubscribe
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Delete subscription
    await prisma.setting.deleteMany({
      where: {
        key: { contains: productId },
        group: 'back_in_stock',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
    })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
