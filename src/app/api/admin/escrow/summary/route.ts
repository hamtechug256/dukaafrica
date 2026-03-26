/**
 * API: Get Escrow Summary
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { getEscrowSummary } from '@/lib/escrow'

async function checkAdminAccess() {
  const { userId } = await auth()
  if (!userId) return null
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true }
  })
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
  return user
}

export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const summary = await getEscrowSummary()
    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch escrow summary' }, { status: 500 })
  }
}
