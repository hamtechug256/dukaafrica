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

    const stores = await prisma.store.findMany({
      include: {
        User: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { Product: true, Order: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to match expected format for admin pages
    const transformedStores = stores.map((store) => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      description: store.description,
      isVerified: store.isVerified,
      verificationTier: store.verificationTier || 'STARTER',
      commissionRate: store.commissionRate ? Number(store.commissionRate) : null,
      country: store.country,
      isActive: store.isActive,
      createdAt: store.createdAt,
      user: {
        id: store.User.id,
        name: store.User.name,
        email: store.User.email,
      },
      totalOrders: store._count.Order,
      totalProducts: store._count.Product,
    }))

    return NextResponse.json({ stores: transformedStores })
  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
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
    const { storeId, isVerified, isActive } = body

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        ...(isVerified !== undefined && { isVerified, verifiedAt: isVerified ? new Date() : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ store })
  } catch (error) {
    console.error('Error updating store:', error)
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
  }
}
