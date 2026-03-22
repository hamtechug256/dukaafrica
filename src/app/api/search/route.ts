/**
 * API: Search
 * 
 * GET /api/search?q=query
 * 
 * Returns products, categories, stores, and suggestions matching the query
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (query.trim().length < 2) {
      return NextResponse.json({
        products: [],
        categories: [],
        stores: [],
        suggestions: [],
      })
    }

    const searchTerm = query.trim().toLowerCase()

    // Search products
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        currency: true,
        images: true,
        store: {
          select: { name: true },
        },
      },
      take: 4,
    })

    // Search categories
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
      },
      take: 3,
    })

    // Search stores
    const stores = await prisma.store.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
      },
      take: 3,
    })

    // Generate suggestions
    const suggestions: string[] = []

    // Add product names as suggestions
    products.forEach((p) => {
      if (p.name.toLowerCase().includes(searchTerm)) {
        suggestions.push(p.name)
      }
    })

    // Add some generic suggestions based on common searches
    const commonSuggestions = [
      'iPhone', 'Samsung', 'Laptop', 'Headphones', 'Shoes', 'Dress',
      'Watch', 'Bag', 'Phone case', 'Charger', 'Earbuds',
    ]

    commonSuggestions.forEach((s) => {
      if (s.toLowerCase().includes(searchTerm) && !suggestions.includes(s)) {
        suggestions.push(s)
      }
    })

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        currency: p.currency,
        image: p.images ? JSON.parse(p.images)[0] : null,
        storeName: p.store.name,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
      })),
      stores: stores.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logo: s.logo,
      })),
      suggestions: suggestions.slice(0, 5),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
