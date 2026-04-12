import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // Create a sample banner with all new fields to showcase the professional system
    const banner = await prisma.banner.create({
      data: {
        title: 'The best affordable snickers',
        subtitle: "You won't regret a try — quality at the best price across East Africa",
        image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1920&h=600&fit=crop&q=80',
        imageMobile: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=400&fit=crop&q=80',
        link: '/search?q=snickers',
        buttonText: 'Shop Now',
        badgeText: 'Best Deal',
        badgeColor: 'orange',
        overlayStyle: 'dark',
        textPosition: 'left',
        position: 'HOME_SLIDER',
        order: 0,
        isActive: true,
      },
    })

    return NextResponse.json({
      message: 'Sample banner created with all new fields',
      banner,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
