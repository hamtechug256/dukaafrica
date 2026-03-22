import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET user's orders
export async function GET(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    // Auto-create user if not found (in case webhook didn't fire)
    if (!user) {
      console.log(`[Orders API] User not found in database, auto-creating: ${userId}`)
      
      try {
        const client = await clerkClient()
        const clerkUser = await client.users.getUser(userId)
        
        user = await prisma.user.create({
          data: {
            clerkId: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
            avatar: clerkUser.imageUrl,
            role: 'BUYER',
          }
        })
        console.log(`[Orders API] User auto-created: ${userId}`)
      } catch (createError) {
        console.error('[Orders API] Failed to auto-create user:', createError)
        return NextResponse.json({ 
          error: 'User account setup incomplete. Please try logging out and back in.',
          code: 'USER_NOT_FOUND'
        }, { status: 400 })
      }
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = { userId: user.id }
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          OrderItem: {
            include: {
              Product: {
                select: { id: true, name: true, images: true, slug: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where })
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total
      }
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
