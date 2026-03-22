import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/admin/setup
 *
 * Secure admin setup endpoint.
 *
 * Requirements:
 * 1. User must be authenticated
 * 2. User's email must be in SUPER_ADMIN_EMAILS environment variable
 * 3. SETUP_SECRET must be provided in request body (matches SETUP_SECRET env)
 * 4. No SUPER_ADMIN must exist yet (one-time setup)
 *
 * Environment Variables:
 * - SUPER_ADMIN_EMAILS: Comma-separated list of allowed admin emails
 * - SETUP_SECRET: A random secret string for securing the setup process
 */
export async function POST(req: Request) {
  try {
    // Check for setup secret in environment
    const SETUP_SECRET = process.env.SETUP_SECRET
    if (!SETUP_SECRET) {
      console.error('SETUP_SECRET not configured in environment')
      return NextResponse.json({
        error: 'Server misconfiguration',
        hint: 'SETUP_SECRET environment variable must be set'
      }, { status: 500 })
    }

    // Get allowed admin emails from environment
    const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    if (SUPER_ADMIN_EMAILS.length === 0) {
      console.error('SUPER_ADMIN_EMAILS not configured in environment')
      return NextResponse.json({
        error: 'Server misconfiguration',
        hint: 'SUPER_ADMIN_EMAILS environment variable must be set'
      }, { status: 500 })
    }

    // Verify authentication
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json({
        error: 'Unauthorized',
        hint: 'Please sign in first'
      }, { status: 401 })
    }

    // Get request body
    const body = await req.json().catch(() => ({}))
    const { secret } = body

    // Verify setup secret
    if (secret !== SETUP_SECRET) {
      console.warn(`Invalid setup secret attempt by: ${user.emailAddresses[0]?.emailAddress}`)
      return NextResponse.json({
        error: 'Invalid setup secret',
        hint: 'Contact the system administrator for the setup secret'
      }, { status: 403 })
    }

    // Check if user's email is in allowed list
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || ''
    if (!SUPER_ADMIN_EMAILS.includes(userEmail)) {
      console.warn(`Unauthorized admin setup attempt by: ${userEmail}`)
      return NextResponse.json({
        error: 'Unauthorized',
        hint: 'Your email is not in the allowed admin list'
      }, { status: 403 })
    }

    // Check if any SUPER_ADMIN already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    if (existingSuperAdmin) {
      return NextResponse.json({
        error: 'Setup already complete',
        hint: 'A super admin already exists. This endpoint is now disabled.'
      }, { status: 403 })
    }

    // Find or create user in database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!dbUser) {
      // Create new user as SUPER_ADMIN
      const newUser = await prisma.user.create({
        data: {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          clerkId: userId,
          email: userEmail,
          firstName: user.firstName,
          lastName: user.lastName,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
          avatar: user.imageUrl,
          role: 'SUPER_ADMIN',
          updatedAt: new Date(),
        }
      })

      console.log(`✅ SUPER_ADMIN created: ${userEmail}`)
      return NextResponse.json({
        success: true,
        message: 'Super admin account created successfully'
      })
    }

    // Promote existing user to SUPER_ADMIN
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        role: 'SUPER_ADMIN',
        updatedAt: new Date()
      }
    })

    console.log(`✅ User promoted to SUPER_ADMIN: ${userEmail}`)
    return NextResponse.json({
      success: true,
      message: 'Promoted to super admin successfully'
    })

  } catch (error) {
    console.error('Admin setup error:', error)
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/setup/status
 * Returns whether admin setup is needed (no sensitive info)
 */
export async function GET() {
  try {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    })

    return NextResponse.json({
      setupComplete: superAdminCount > 0,
      superAdminCount
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
