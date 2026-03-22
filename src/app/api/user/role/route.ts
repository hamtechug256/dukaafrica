import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json({ user: null })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        isAdmin: dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN',
        isSeller: dbUser.role === 'SELLER' || dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN',
        role: dbUser.role,
      },
    })
  } catch (error) {
    console.error('Error checking user role:', error)
    return NextResponse.json({ user: null, error: 'Failed to check user role' }, { status: 500 })
  }
}
