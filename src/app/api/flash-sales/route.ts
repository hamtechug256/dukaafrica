import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch active flash sales for public display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const now = new Date()

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        isFlashSale: true,
        flashSaleStart: { lte: now },
        flashSaleEnd: { gte: now },
      },
      include: {
        Store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        Category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      take: limit,
      orderBy: {
        flashSaleClaimed: 'desc',
      },
    })

    // Transform products for display
    const flashDeals = products.map(product => {
      const images = product.images ? JSON.parse(product.images) : []
      const salePrice = product.flashSaleDiscount
        ? product.price * (1 - product.flashSaleDiscount / 100)
        : product.price

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        originalPrice: product.price,
        salePrice: Math.round(salePrice),
        discount: product.flashSaleDiscount || 0,
        image: images[0] || null,
        sold: product.flashSaleClaimed,
        total: product.flashSaleStock || 0,
        endTime: product.flashSaleEnd,
        store: product.Store,
        category: product.Category,
        currency: product.currency,
      }
    })

    return NextResponse.json({ flashDeals })
  } catch (error) {
    console.error('Error fetching flash sales:', error)
    return NextResponse.json({ error: 'Failed to fetch flash sales' }, { status: 500 })
  }
}
