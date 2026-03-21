import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Super admin emails from environment variable
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * GET /api/user/role
 * 
 * Returns the user's role from the DATABASE.
 * Auto-promotes users whose emails are in SUPER_ADMIN_EMAILS.
 * Creates user in database if they don't exist.
 */
export async function GET() {
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()

    if (!userId || !clerkUser) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase() || ''
    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email)

    console.log(`[ROLE CHECK] Email: ${email}, IsSuperAdminEmail: ${isSuperAdminEmail}`)
    console.log(`[ROLE CHECK] SUPER_ADMIN_EMAILS env: "${process.env.SUPER_ADMIN_EMAILS || 'NOT SET'}"`)
    console.log(`[ROLE CHECK] Parsed list:`, SUPER_ADMIN_EMAILS)

    // Find user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
      }
    })

    // If user doesn't exist, create them
    if (!user) {
      const role = isSuperAdminEmail ? 'SUPER_ADMIN' : 'BUYER'

      user = await prisma.user.create({
        data: {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          clerkId: userId,
          email: email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
          avatar: clerkUser.imageUrl,
          role: role,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          role: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        }
      })

      console.log(`✅ [ROLE] Created user: ${email} with role: ${role}`)
    }
    // If user exists but should be super admin, promote them
    else if (isSuperAdminEmail && user.role !== 'SUPER_ADMIN') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN', updatedAt: new Date() },
        select: {
          id: true,
          role: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        }
      })

      console.log(`✅ [ROLE] Auto-promoted to SUPER_ADMIN: ${email}`)
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user!.role)
    const isSuperAdmin = user!.role === 'SUPER_ADMIN'
    const isSeller = ['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(user!.role)

    console.log(`[ROLE RESULT] ${email}: role=${user!.role}, isAdmin=${isAdmin}`)

    return NextResponse.json({
      authenticated: true,
      success: true,
      user: {
        id: user!.id,
        role: user!.role,
        email: user!.email,
        name: user!.name,
        firstName: user!.firstName,
        lastName: user!.lastName,
        isAdmin,
        isSuperAdmin,
        isSeller,
      }
    })
  } catch (error) {
    console.error('[ROLE ERROR]', error)
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Failed to fetch user role',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
