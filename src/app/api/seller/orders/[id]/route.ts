/**
 * API: Seller Order Details
 * 
 * GET /api/seller/orders/[id] - Get order details
 * PATCH /api/seller/orders/[id] - Update order (status, bus details)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// GET - Fetch order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller's store
    const store = await prisma.store.findFirst({
      where: { user: { clerkId: userId } }
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get order with items
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        storeId: store.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Format response
    const formattedOrder = {
      ...order,
      items: order.items.map(item => ({
        ...item,
        productImage: item.product.images ? JSON.parse(item.product.images)[0] : null,
        productName: item.product.name,
      }))
    }

    return NextResponse.json({ order: formattedOrder })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// PATCH - Update order status and bus details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller's store
    const store = await prisma.store.findFirst({
      where: { user: { clerkId: userId } }
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, busDetails } = body

    // Verify order belongs to this store
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: params.id,
        storeId: store.id,
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (status) {
      updateData.status = status
      
      // Set timestamps based on status
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date()
      }
    }

    if (busDetails) {
      updateData.busCompany = busDetails.busCompany
      updateData.busNumberPlate = busDetails.busNumberPlate
      updateData.conductorPhone = busDetails.conductorPhone
      updateData.pickupLocation = busDetails.pickupLocation
    }

    // Update order
    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: { name: true, images: true }
            }
          }
        }
      }
    })

    // If order is delivered, update seller's available balance
    if (status === 'DELIVERED' && existingOrder.paymentStatus === 'PAID') {
      const sellerEarnings = (existingOrder.sellerProductEarnings || 0) + (existingOrder.sellerShippingAmount || 0)
      
      await prisma.store.update({
        where: { id: store.id },
        data: {
          availableBalance: { increment: sellerEarnings },
          pendingBalance: { decrement: Math.min(sellerEarnings, store.pendingBalance) },
          totalSales: { increment: existingOrder.subtotal },
          totalOrders: { increment: 1 }
        }
      })
    }

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
