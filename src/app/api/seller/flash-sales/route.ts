import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getStoreTier } from '@/lib/seller-tiers'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// GET - Fetch seller's flash sales
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId (must be active)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    const now = new Date()

    // Build where clause based on filter
    let whereClause: any = {
      storeId: store.id,
    }

    if (filter === 'active') {
      whereClause.isFlashSale = true
      whereClause.flashSaleStart = { lte: now }
      whereClause.flashSaleEnd = { gte: now }
      // Also check that there's remaining stock
      whereClause.flashSaleStock = { gt: 0 }
    } else if (filter === 'upcoming') {
      whereClause.isFlashSale = true
      whereClause.flashSaleStart = { gt: now }
    } else if (filter === 'ended') {
      whereClause.isFlashSale = true
      whereClause.flashSaleEnd = { lt: now }
    } else if (filter === 'not-set') {
      whereClause.isFlashSale = false
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        Category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { flashSaleStart: 'desc' },
    })

    // Calculate stats
    const allProducts = await prisma.product.findMany({
      where: { storeId: store.id },
      select: {
        isFlashSale: true,
        flashSaleStart: true,
        flashSaleEnd: true,
        flashSaleDiscount: true,
        flashSaleStock: true,
        flashSaleClaimed: true,
        price: true,
      },
    })

    const stats = {
      active: allProducts.filter(p => 
        p.isFlashSale && 
        p.flashSaleStart && 
        p.flashSaleEnd && 
        (p.flashSaleStock ?? 0) > 0 &&  // Check remaining stock, default to 0 if null
        new Date(p.flashSaleStart) <= now && 
        new Date(p.flashSaleEnd) >= now
      ).length,
      upcoming: allProducts.filter(p => 
        p.isFlashSale && 
        p.flashSaleStart && 
        new Date(p.flashSaleStart) > now
      ).length,
      ended: allProducts.filter(p => 
        p.isFlashSale && 
        p.flashSaleEnd && 
        new Date(p.flashSaleEnd) < now
      ).length,
      outOfStock: allProducts.filter(p =>
        p.isFlashSale &&
        p.flashSaleStart &&
        p.flashSaleEnd &&
        new Date(p.flashSaleStart) <= now &&
        new Date(p.flashSaleEnd) >= now &&
        (!p.flashSaleStock || p.flashSaleStock <= 0)
      ).length,
      totalSaved: allProducts.reduce((sum, p) => {
        if (p.flashSaleDiscount && p.flashSaleClaimed) {
          const price = toNum(p.price)
          const discount = toNum(p.flashSaleDiscount)
          return sum + (price * (discount / 100) * p.flashSaleClaimed)
        }
        return sum
      }, 0),
    }

    return NextResponse.json({ products, stats })
  } catch (error) {
    console.error('Error fetching flash sales:', error)
    return NextResponse.json({ error: 'Failed to fetch flash sales' }, { status: 500 })
  }
}

// POST - Create flash sale
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId (must be active)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Enforce tier feature flag — only VERIFIED and PREMIUM can create flash sales
    const tier = await getStoreTier(store)
    if (!tier.canCreateFlashSales) {
      return NextResponse.json({
        error: 'Flash sales require VERIFIED or PREMIUM seller tier',
        details: {
          currentTier: store.verificationTier,
          message: 'Please complete verification to unlock flash sales.',
        }
      }, { status: 403 })
    }

    const body = await request.json()
    const { productId, discount, stock, startAt, endAt } = body

    // Validate product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Validate inputs
    if (discount < 1 || discount > 99) {
      return NextResponse.json({ error: 'Discount must be between 1% and 99%' }, { status: 400 })
    }

    if (stock > product.quantity) {
      return NextResponse.json({ error: 'Flash sale stock cannot exceed available stock' }, { status: 400 })
    }

    const startDate = new Date(startAt)
    const endDate = new Date(endAt)

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    // Update product with flash sale
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isFlashSale: true,
        flashSaleDiscount: discount,
        flashSaleStock: stock,
        flashSaleStart: startDate,
        flashSaleEnd: endDate,
        flashSaleClaimed: 0,
      },
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error creating flash sale:', error)
    return NextResponse.json({ error: 'Failed to create flash sale' }, { status: 500 })
  }
}

// PUT - Update flash sale
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()
    const { productId, discount, stock, startAt, endAt } = body

    // Validate product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Validate inputs
    if (discount && (discount < 1 || discount > 99)) {
      return NextResponse.json({ error: 'Discount must be between 1% and 99%' }, { status: 400 })
    }

    if (stock && stock > product.quantity) {
      return NextResponse.json({ error: 'Flash sale stock cannot exceed available stock' }, { status: 400 })
    }

    const updateData: any = {}
    if (discount !== undefined) updateData.flashSaleDiscount = discount
    if (stock !== undefined) updateData.flashSaleStock = stock
    if (startAt !== undefined) updateData.flashSaleStart = new Date(startAt)
    if (endAt !== undefined) updateData.flashSaleEnd = new Date(endAt)

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error updating flash sale:', error)
    return NextResponse.json({ error: 'Failed to update flash sale' }, { status: 500 })
  }
}

// DELETE - End/Cancel flash sale
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    // Validate product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // End flash sale
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isFlashSale: false,
        flashSaleDiscount: null,
        flashSaleStock: null,
        flashSaleStart: null,
        flashSaleEnd: null,
      },
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error ending flash sale:', error)
    return NextResponse.json({ error: 'Failed to end flash sale' }, { status: 500 })
  }
}
