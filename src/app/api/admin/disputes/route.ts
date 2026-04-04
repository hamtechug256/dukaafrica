/**
 * API: List Disputes (Admin)
 *
 * GET /api/admin/disputes
 *
 * Lists all disputes for admin review.
 * - Filter by status, storeId
 * - Include order details, buyer info, seller info
 * - Pagination support
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const storeId = searchParams.get('storeId')
    const reason = searchParams.get('reason')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (storeId) {
      where.storeId = storeId
    }

    if (reason && reason !== 'ALL') {
      where.reason = reason
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get disputes with related data
    const [disputes, totalCount] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          Order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              currency: true,
              status: true,
              paymentStatus: true,
              escrowStatus: true,
              createdAt: true,
              OrderItem: {
                select: {
                  productName: true,
                  quantity: true,
                  productImage: true,
                },
                take: 3,
              },
            },
          },
          Store: {
            select: {
              id: true,
              name: true,
              slug: true,
              verificationTier: true,
            },
          },
          DisputeMessage: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.dispute.count({ where }),
    ])

    // Get buyer and seller info
    const disputesWithUsers = await Promise.all(
      disputes.map(async (dispute) => {
        const [buyer, seller] = await Promise.all([
          prisma.user.findUnique({
            where: { id: dispute.buyerId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          }),
          prisma.user.findUnique({
            where: { id: dispute.sellerId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          }),
        ])

        return {
          ...dispute,
          buyer,
          seller,
          messageCount: dispute.DisputeMessage.length,
        }
      })
    )

    // Calculate statistics
    const stats = await prisma.dispute.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })

    const statusCounts: Record<string, number> = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      ESCALATED: 0,
    }

    stats.forEach((stat) => {
      statusCounts[stat.status] = stat._count.id
    })

    return NextResponse.json({
      disputes: disputesWithUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + limit < totalCount,
      },
      stats: statusCounts,
    })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 })
  }
}
