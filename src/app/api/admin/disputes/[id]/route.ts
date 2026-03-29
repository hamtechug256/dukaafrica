/**
 * API: Get Dispute Details (Admin)
 *
 * GET /api/admin/disputes/[id]
 *
 * Returns detailed information about a dispute including:
 * - All messages between buyer and seller
 * - Evidence from both parties
 * - Order information
 * - Buyer and seller details
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Check admin access
async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    // Get dispute with all related data
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        Order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            subtotal: true,
            shippingFee: true,
            currency: true,
            status: true,
            paymentStatus: true,
            escrowStatus: true,
            createdAt: true,
            updatedAt: true,
            deliveredAt: true,
            shippedAt: true,
            shippingName: true,
            shippingPhone: true,
            shippingAddress: true,
            shippingCity: true,
            shippingCountry: true,
            busCompany: true,
            busNumberPlate: true,
            pickupLocation: true,
            trackingNumber: true,
            shipmentProofUrl: true,
            waybillPhotoUrl: true,
            sellerProductEarnings: true,
            platformProductCommission: true,
            OrderItem: {
              select: {
                id: true,
                productName: true,
                variantName: true,
                quantity: true,
                price: true,
                total: true,
                productImage: true,
                productSku: true,
                Product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            Payment: {
              select: {
                id: true,
                method: true,
                provider: true,
                amount: true,
                currency: true,
                status: true,
                paidAt: true,
              },
            },
          },
        },
        Store: {
          select: {
            id: true,
            name: true,
            slug: true,
            verificationTier: true,
            verificationStatus: true,
            phone: true,
            email: true,
            country: true,
            city: true,
            totalOrders: true,
            successfulDeliveries: true,
            disputedOrders: true,
            deliverySuccessRate: true,
          },
        },
        DisputeMessage: {
          orderBy: { createdAt: 'asc' },
          include: {
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Get buyer info
    const buyer = await prisma.user.findUnique({
      where: { id: dispute.buyerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        country: true,
        createdAt: true,
      },
    })

    // Get seller info
    const seller = await prisma.user.findUnique({
      where: { id: dispute.sellerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        country: true,
        createdAt: true,
      },
    })

    // Get escrow transaction (use findFirst for multi-vendor support)
    const escrow = await prisma.escrowTransaction.findFirst({
      where: { orderId: dispute.orderId },
    })

    // Get admin who resolved (if any)
    let resolvedByAdmin: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      role: string;
    } | null = null
    if (dispute.resolvedBy) {
      resolvedByAdmin = await prisma.user.findUnique({
        where: { id: dispute.resolvedBy },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      })
    }

    // Parse evidence JSON strings
    const parsedDispute = {
      ...dispute,
      buyerEvidence: dispute.buyerEvidence ? JSON.parse(dispute.buyerEvidence) : null,
      sellerEvidence: dispute.sellerEvidence ? JSON.parse(dispute.sellerEvidence) : null,
      DisputeMessage: dispute.DisputeMessage.map((msg) => ({
        ...msg,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
      })),
    }

    // Calculate timeline
    const timeline: Array<{
      type: string;
      timestamp: Date;
      description: string;
    }> = []

    // Order created
    if (dispute.Order) {
      timeline.push({
        type: 'ORDER_CREATED',
        timestamp: dispute.Order.createdAt,
        description: `Order #${dispute.Order.orderNumber} created`,
      })

      // Payment received
      if (dispute.Order.Payment?.paidAt) {
        timeline.push({
          type: 'PAYMENT_RECEIVED',
          timestamp: dispute.Order.Payment.paidAt,
          description: `Payment of ${dispute.Order.Payment.currency} ${dispute.Order.Payment.amount.toLocaleString()} received via ${dispute.Order.Payment.method}`,
        })
      }

      // Order shipped
      if (dispute.Order.shippedAt) {
        timeline.push({
          type: 'ORDER_SHIPPED',
          timestamp: dispute.Order.shippedAt,
          description: dispute.Order.busCompany
            ? `Order shipped via ${dispute.Order.busCompany} (${dispute.Order.busNumberPlate || 'N/A'})`
            : 'Order shipped',
        })
      }

      // Order delivered
      if (dispute.Order.deliveredAt) {
        timeline.push({
          type: 'ORDER_DELIVERED',
          timestamp: dispute.Order.deliveredAt,
          description: 'Order marked as delivered',
        })
      }
    }

    // Dispute opened
    timeline.push({
      type: 'DISPUTE_OPENED',
      timestamp: dispute.createdAt,
      description: `Dispute opened: ${dispute.reason.replace(/_/g, ' ')}`,
    })

    // Buyer responded
    if (dispute.buyerRespondedAt) {
      timeline.push({
        type: 'BUYER_RESPONDED',
        timestamp: dispute.buyerRespondedAt,
        description: 'Buyer provided additional information',
      })
    }

    // Seller responded
    if (dispute.sellerRespondedAt) {
      timeline.push({
        type: 'SELLER_RESPONDED',
        timestamp: dispute.sellerRespondedAt,
        description: 'Seller responded to dispute',
      })
    }

    // Dispute escalated
    if (dispute.escalatedAt) {
      timeline.push({
        type: 'DISPUTE_ESCALATED',
        timestamp: dispute.escalatedAt,
        description: 'Dispute escalated for admin review',
      })
    }

    // Dispute resolved
    if (dispute.resolvedAt) {
      timeline.push({
        type: 'DISPUTE_RESOLVED',
        timestamp: dispute.resolvedAt,
        description: `Dispute resolved: ${dispute.resolution?.replace(/_/g, ' ') || 'Unknown'}`,
      })
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json({
      dispute: parsedDispute,
      buyer,
      seller,
      escrow,
      resolvedByAdmin,
      timeline,
    })
  } catch (error) {
    console.error('Error fetching dispute details:', error)
    return NextResponse.json({ error: 'Failed to fetch dispute details' }, { status: 500 })
  }
}
