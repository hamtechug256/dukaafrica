/**
 * ONE-TIME FIX: Activate all existing banners
 * DELETE THIS AFTER RUNNING
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const result = await prisma.banner.updateMany({
      where: { isActive: false },
      data: { isActive: true },
    })

    const allBanners = await prisma.banner.findMany()

    return NextResponse.json({
      message: `Activated ${result.count} banner(s)`,
      updated: result.count,
      banners: allBanners,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 })
  }
}
