import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/stores/[slug] - Get public store profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const store = await prisma.store.findUnique({
      where: { slug },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            avatar: true,
            createdAt: true,
          },
        },
        Product: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            currency: true,
            images: true,
            rating: true,
            reviewCount: true,
            quantity: true,
            Category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: {
            Product: { where: { status: 'ACTIVE' } },
            Order: true,
          },
        },
      },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (!store.isActive) {
      return NextResponse.json({ error: 'Store is not active' }, { status: 404 })
    }

    // Parse images for products
    const productsWithImages = store.Product.map(product => ({
      ...product,
      imagesArray: product.images ? JSON.parse(product.images) : [],
    }))

    return NextResponse.json({
      Store: {
        ...store,
        products: productsWithImages,
      },
    })
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
  }
}
