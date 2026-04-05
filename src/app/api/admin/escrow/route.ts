import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// GET /api/admin/escrow — Paginated escrow transaction listing (admin only)
export async function GET(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const storeId = searchParams.get('storeId')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build filter
    const where: any = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (storeId) {
      where.storeId = storeId
    }

    if (search) {
      where.OR = [
        { Order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { Store: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Fetch paginated escrow transactions + total in parallel
    const [transactions, total] = await Promise.all([
      prisma.escrowTransaction.findMany({
        where,
        include: {
          Order: {
            select: { id: true, orderNumber: true, status: true, createdAt: true },
          },
          Store: {
            select: { id: true, name: true },
          },
          User: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.escrowTransaction.count({ where }),
    ])

    // Transform for frontend consumption
    const transformed = transactions.map((tx) => ({
      id: tx.id,
      orderId: tx.orderId,
      orderNumber: tx.Order?.orderNumber,
      orderStatus: tx.Order?.status,
      orderDate: tx.Order?.createdAt,
      storeId: tx.storeId,
      storeName: tx.Store?.name,
      buyerId: tx.buyerId,
      buyerEmail: tx.User?.email,
      buyerName: tx.User?.name,
      grossAmount: toNum(tx.grossAmount),
      sellerAmount: toNum(tx.sellerAmount),
      platformAmount: toNum(tx.platformAmount),
      reserveAmount: toNum(tx.reserveAmount),
      refundAmount: toNum(tx.refundAmount),
      currency: tx.currency,
      status: tx.status,
      releaseType: tx.releaseType,
      heldAt: tx.heldAt,
      releaseAt: tx.releaseAt,
      releasedAt: tx.releasedAt,
      refundedAt: tx.refundedAt,
      createdAt: tx.createdAt,
    }))

    // Stats using efficient aggregate
    const statsData = await prisma.escrowTransaction.groupBy({
      by: ['status'],
      _sum: {
        sellerAmount: true,
        platformAmount: true,
        reserveAmount: true,
      },
      _count: true,
    })

    const stats: Record<string, { count: number; sellerAmount: number; platformAmount: number }> = {}
    for (const row of statsData) {
      stats[row.status] = {
        count: row._count,
        sellerAmount: toNum(row._sum.sellerAmount),
        platformAmount: toNum(row._sum.platformAmount),
      }
    }

    return NextResponse.json({
      transactions: transformed,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      stats,
    })
  } catch (error) {
    console.error('Error fetching admin escrow transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch escrow transactions' }, { status: 500 })
  }
}
