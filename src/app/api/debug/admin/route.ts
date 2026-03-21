import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Debug endpoint - DISABLE IN PRODUCTION
export async function GET() {
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()

    // Get env var (mask for security)
    const superAdminEnv = process.env.SUPER_ADMIN_EMAILS || ''
    const maskedEnv = superAdminEnv.split(',').map(e => {
      const trimmed = e.trim().toLowerCase()
      if (trimmed.length < 3) return trimmed
      return trimmed.substring(0, 2) + '***' + trimmed.substring(trimmed.length - 2)
    }).join(', ')

    if (!userId || !clerkUser) {
      return NextResponse.json({
        authenticated: false,
        message: 'Not logged in',
        superAdminEnv: maskedEnv,
        superAdminCount: superAdminEnv.split(',').filter(e => e.trim()).length,
      })
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase() || ''
    const emailFromEnv = superAdminEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isEmailInEnv = emailFromEnv.includes(email)

    // Check database
    const dbUser = await prisma.user.findUnique({
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
      database: dbUser ? {
        id: dbUser.id,
        role: dbUser.role,
        email: dbUser.email,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      } : null,
      analysis: {
        should: isEmailInEnv ? 'SUPER_ADMIN' : (dbUser?.role || 'Not in DB'),
        actual: dbUser?.role || 'Not in DB',
        needsFix: isEmailInEnv && dbUser?.role !== 'SUPER_ADMIN',
      },
      isAdmin: dbUser ? ['ADMIN', 'SUPER_ADMIN'].includes(dbUser.role) : false,
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
