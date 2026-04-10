import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

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
            isVerified: true,
            rating: true,
            country: true,
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
      const price = toNum(product.price)
      const discount = toNum(product.flashSaleDiscount) || 0
      const salePrice = discount
        ? price * (1 - discount / 100)
        : price

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        originalPrice: price,
        salePrice: Math.round(salePrice),
        discount,
        image: images[0] || null,
        sold: product.flashSaleClaimed,
        total: product.flashSaleStock || 0,
        endTime: product.flashSaleEnd,
        store: product.Store,
        category: product.Category,
        currency: product.currency,
        weight: product.weight ? toNum(product.weight) : null,
        freeShipping: !!product.freeShipping,
        localShippingOnly: !!product.localShippingOnly,
        shipsToCountries: product.shipsToCountries || null,
      }
    })

    return NextResponse.json({ flashDeals })
  } catch (error) {
    console.error('Error fetching flash sales:', error)
    return NextResponse.json({ error: 'Failed to fetch flash sales' }, { status: 500 })
  }
}
