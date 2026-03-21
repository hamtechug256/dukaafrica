import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET user's wishlist
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

    const wishlist = await prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        Product: {
          include: {
            Store: {
              select: { id: true, name: true, slug: true, isVerified: true }
            },
            Category: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ wishlist })
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
  }
}

// POST add to wishlist
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { productId } = body

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Already in wishlist' }, { status: 400 })
    }

    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: user.id,
        productId,
      },
    })

    return NextResponse.json({ wishlistItem })
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 })
  }
}

// DELETE remove from wishlist
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 })
  }
}
