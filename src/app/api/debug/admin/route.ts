import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// SECURITY FIX: Debug endpoint now requires SUPER_ADMIN authentication
// Previously this was accessible to anyone (public route in middleware)
export async function GET() {
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()

    if (!userId || !clerkUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only super admins can access debug info
    const superAdminEnv = process.env.SUPER_ADMIN_EMAILS || ''
    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase() || ''
    const superAdminEmails = superAdminEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

    if (!superAdminEmails.includes(email)) {
      return NextResponse.json(
        { error: 'Forbidden. Super admin access required.' },
        { status: 403 }
      )
    }

    // Get env var (mask for security)
    const maskedEnv = superAdminEmails.map(e => {
      if (e.length < 3) return e
      return e.substring(0, 2) + '***' + e.substring(e.length - 2)
    }).join(', ')

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
      analysis: {
        should: superAdminEmails.includes(email) ? 'SUPER_ADMIN' : (dbUser?.role || 'Not in DB'),
        actual: dbUser?.role || 'Not in DB',
        needsFix: superAdminEmails.includes(email) && dbUser?.role !== 'SUPER_ADMIN',
      },
    })
  } catch (error) {
    console.error('Debug failed:', error)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
