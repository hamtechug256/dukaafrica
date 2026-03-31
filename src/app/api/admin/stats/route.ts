import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    console.log(`✅ Created user: ${email} with role: ${user.role}`)
    return user
  }

  // Auto-promote if email matches SUPER_ADMIN_EMAILS
  if (isSuperAdminEmail && user.role !== 'SUPER_ADMIN') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN', updatedAt: new Date() }
    })
    console.log(`✅ Auto-promoted to SUPER_ADMIN: ${email}`)
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

    // Logging - do NOT log sensitive email lists
    console.log(`[ADMIN STATS] User role check: ${user?.role}`)

    // Check if user is admin
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      console.log(`[ADMIN STATS] ACCESS DENIED for user with role ${user?.role}`)
      // SECURITY: Return generic error - do NOT leak email, role, or config info
      return NextResponse.json({ 
        error: 'Access denied',
      }, { status: 403 })
    }

    console.log(`[ADMIN STATS] ACCESS GRANTED for ${user.email}`)

    // Get stats
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
      totalRevenue,
      lastMonthRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1))
          }
        }
      }),
      prisma.store.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.store.count({ where: { isVerified: false } }),
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.order.count({ where: { status: 'RETURNED' } }),
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'PAID',
          paidAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            lt: new Date(new Date().setDate(1))
          }
        },
        _sum: { amount: true }
      }),
    ])

    const currentMonthRevenue = await prisma.payment.aggregate({
      where: {
        status: 'PAID',
        paidAt: {
          gte: new Date(new Date().setDate(1))
        }
      },
      _sum: { amount: true }
    })

    const revenueGrowth = lastMonthRevenue._sum.amount 
      ? ((currentMonthRevenue._sum.amount || 0) - (lastMonthRevenue._sum.amount || 0)) / (lastMonthRevenue._sum.amount || 1)
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
        total: totalRevenue._sum.amount || 0,
        growth: revenueGrowth,
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
