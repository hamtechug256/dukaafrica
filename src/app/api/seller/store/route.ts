import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Generate a URL-friendly slug from store name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Math.random().toString(36).substring(2, 8)
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      storeName,
      storeDescription,
      storeCategory,
      country,
      region,
      city,
      address,
      phone,
      email,
      businessName,
      businessType,
      taxId,
    } = body

    if (!storeName || !country || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get or create user in database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName,
          lastName: user.lastName,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
          avatar: user.imageUrl,
          role: 'SELLER',
        }
      })
    } else {
      // Update role to SELLER
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: 'SELLER' }
      })
    }

    // Check if user already has a store
    const existingStore = await prisma.store.findUnique({
      where: { userId: dbUser.id }
    })

    if (existingStore) {
      return NextResponse.json(
        { error: 'You already have a store', store: existingStore },
        { status: 400 }
      )
    }

    // Create store
    const store = await prisma.store.create({
      data: {
        userId: dbUser.id,
        name: storeName,
        slug: generateSlug(storeName),
        description: storeDescription,
        country,
        region,
        city,
        address,
        phone,
        email: email || user.emailAddresses[0]?.emailAddress,
        businessName,
        businessType,
        taxId,
        isVerified: false,
      }
    })

    return NextResponse.json({ 
      success: true, 
      store 
    })
  } catch (error) {
    console.error('Error creating store:', error)
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
      include: {
        Product: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { Product: true }
        }
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ store })
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}
