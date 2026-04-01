import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Debug endpoint - SUPER_ADMIN only, disabled in production
export async function GET() {
  try {
    // H5 FIX: Block in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 404 })
    }

    const { userId } = await auth()
    const clerkUser = await currentUser()

    if (!userId || !clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // H5 FIX: Require SUPER_ADMIN role (not just any authenticated user)
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })

    if (!dbUser || dbUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN access required' }, { status: 403 })
    }

    const superAdminEnv = process.env.SUPER_ADMIN_EMAILS || ''
    const maskedEnv = superAdminEnv.split(',').map(e => {
      const trimmed = e.trim().toLowerCase()
      if (trimmed.length < 3) return trimmed
      return trimmed.substring(0, 2) + '***' + trimmed.substring(trimmed.length - 2)
    }).join(', ')

    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase() || ''
    const emailFromEnv = superAdminEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isEmailInEnv = emailFromEnv.includes(email)

    const fullDbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        role: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      authenticated: true,
      clerkUser: {
        id: userId,
        email: email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
      envConfig: {
        raw: maskedEnv,
        parsed: emailFromEnv,
        count: emailFromEnv.length,
      },
      match: {
        isEmailInEnv: isEmailInEnv,
        matchedEmail: isEmailInEnv ? email : null,
      },
      database: fullDbUser ? {
        id: fullDbUser.id,
        role: fullDbUser.role,
        email: fullDbUser.email,
        createdAt: fullDbUser.createdAt,
        updatedAt: fullDbUser.updatedAt,
      } : null,
      analysis: {
        should: isEmailInEnv ? 'SUPER_ADMIN' : (fullDbUser?.role || 'Not in DB'),
        actual: fullDbUser?.role || 'Not in DB',
        needsFix: isEmailInEnv && fullDbUser?.role !== 'SUPER_ADMIN',
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
