import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        Store: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Transform to match expected format
    const transformedUsers = users.map((u) => ({
      ...u,
      store: u.Store,
    }))

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { targetUserId, role, isActive } = body

    // SECURITY: Only SUPER_ADMIN can assign the SUPER_ADMIN role.
    // An ADMIN must not be able to escalate privileges to SUPER_ADMIN,
    // which would grant full platform control including escrow, payouts, etc.
    if (role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // SECURITY: ADMIN users can only assign BUYER, SELLER, or ADMIN roles.
    // SUPER_ADMIN can assign any role including SUPER_ADMIN.
    const ALLOWED_ADMIN_ROLES = ['BUYER', 'SELLER', 'ADMIN']
    if (adminUser.role === 'ADMIN' && role && !ALLOWED_ADMIN_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
