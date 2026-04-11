import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Super admin emails from environment
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * Helper to ensure user is admin (auto-promotes if email matches)
 */
async function ensureAdmin(userId: string) {
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || ''
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email)

  // Find user in database
  let user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  // Create user if doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        clerkId: userId,
        email: email,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null,
        avatar: clerkUser?.imageUrl,
        role: isSuperAdminEmail ? 'SUPER_ADMIN' : 'BUYER',
        updatedAt: new Date(),
      }
    })
    return user
  }

  // Auto-promote if email matches SUPER_ADMIN_EMAILS
  if (isSuperAdminEmail && user.role !== 'SUPER_ADMIN') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN', updatedAt: new Date() }
    })
    return user
  }

  return user
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists and is promoted if needed
    const user = await ensureAdmin(userId)

    // Check if user is admin
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      // SECURITY: Return generic error - do NOT leak email, role, or config info
      return NextResponse.json({ 
        error: 'Access denied',
      }, { status: 403 })
    }

    // Get stats — each query is independent, failures return 0
    const [
      totalUsers,
      newUsersThisMonth,
      totalStores,
      activeStores,
      pendingStores,
      totalProducts,
      activeProducts,
      totalOrders,
      todayOrders,
      disputedOrders,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1))
          }
        }
      }).catch(() => 0),
      prisma.store.count().catch(() => 0),
      prisma.store.count({ where: { isActive: true } }).catch(() => 0),
      prisma.store.count({ where: { isVerified: false } }).catch(() => 0),
      prisma.product.count().catch(() => 0),
      prisma.product.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
      prisma.order.count().catch(() => 0),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }).catch(() => 0),
      prisma.order.count({ where: { status: 'RETURNED' } }).catch(() => 0),
    ])

    // Platform earnings = sum of platformAmount (commission) from paid orders
    // NOT the full order amount (which is seller's money)
    const [totalPlatformEarnings, lastMonthEarnings, currentMonthEarnings] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { platformAmount: true }
      }).catch(() => ({ _sum: { platformAmount: null } })),
      prisma.payment.aggregate({
        where: {
          status: 'PAID',
          paidAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            lt: new Date(new Date().setDate(1))
          }
        },
        _sum: { platformAmount: true }
      }).catch(() => ({ _sum: { platformAmount: null } })),
      prisma.payment.aggregate({
        where: {
          status: 'PAID',
          paidAt: {
            gte: new Date(new Date().setDate(1))
          }
        },
        _sum: { platformAmount: true }
      }).catch(() => ({ _sum: { platformAmount: null } })),
    ])

    const earningsGrowth = lastMonthEarnings._sum.platformAmount 
      ? (toNum(currentMonthEarnings._sum.platformAmount) - toNum(lastMonthEarnings._sum.platformAmount)) / (toNum(lastMonthEarnings._sum.platformAmount) || 1)
      : 0

    return NextResponse.json({
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
      },
      stores: {
        total: totalStores,
        active: activeStores,
        pending: pendingStores,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        flagged: 0,
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
        disputed: disputedOrders,
      },
      revenue: {
        total: toNum(totalPlatformEarnings._sum.platformAmount),
        growth: earningsGrowth,
        currency: 'UGX',
      },
      recentActivity: [
        { type: 'user', message: 'New user registered', time: '2 minutes ago' },
        { type: 'store', message: 'Store verified', time: '15 minutes ago' },
        { type: 'order', message: 'New order placed', time: '30 minutes ago' },
        { type: 'product', message: 'New product listed', time: '1 hour ago' },
        { type: 'payment', message: 'Payment received', time: '2 hours ago' },
      ],
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
