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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [totalOrders, wishlistCount, addresses, reviews] = await Promise.all([
      prisma.order.count({ where: { userId: user.id } }),
      prisma.wishlist.count({ where: { userId: user.id } }),
      prisma.address.count({ where: { userId: user.id } }),
      prisma.review.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({ totalOrders, wishlistCount, addresses, reviews })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
