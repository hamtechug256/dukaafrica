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
 * Syncs user profile data from Clerk.
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

    // Get Clerk user data
    const clerkFirstName = clerkUser.firstName || null
    const clerkLastName = clerkUser.lastName || null
    const clerkName = [clerkFirstName, clerkLastName].filter(Boolean).join(' ') || null
    const clerkAvatar = clerkUser.imageUrl

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
        avatar: true,
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
          firstName: clerkFirstName,
          lastName: clerkLastName,
          name: clerkName,
          avatar: clerkAvatar,
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
          avatar: true,
        }
      })

    } else {
      // User exists - sync profile data from Clerk if needed
      // This ensures names are updated if user updates their Clerk profile
      const needsUpdate = 
        (!user.name && clerkName) ||
        (!user.firstName && clerkFirstName) ||
        (!user.lastName && clerkLastName) ||
        (!user.avatar && clerkAvatar) ||
        (isSuperAdminEmail && user.role !== 'SUPER_ADMIN')

      if (needsUpdate) {
        const updateData: any = { updatedAt: new Date() }
        
        // Only update fields that are missing in DB but present in Clerk
        if (!user.name && clerkName) updateData.name = clerkName
        if (!user.firstName && clerkFirstName) updateData.firstName = clerkFirstName
        if (!user.lastName && clerkLastName) updateData.lastName = clerkLastName
        if (!user.avatar && clerkAvatar) updateData.avatar = clerkAvatar
        
        // Handle super admin promotion
        if (isSuperAdminEmail && user.role !== 'SUPER_ADMIN') {
          updateData.role = 'SUPER_ADMIN'
        }

        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          select: {
            id: true,
            role: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        })

      }
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user!.role)
    const isSuperAdmin = user!.role === 'SUPER_ADMIN'
    const isSeller = ['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(user!.role)

    return NextResponse.json({
      authenticated: true,
      success: true,
      user: {
        id: user!.id,
        role: user!.role,
        email: user!.email,
        name: user!.name || [user!.firstName, user!.lastName].filter(Boolean).join(' ') || null,
        firstName: user!.firstName,
        lastName: user!.lastName,
        avatar: user!.avatar,
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
