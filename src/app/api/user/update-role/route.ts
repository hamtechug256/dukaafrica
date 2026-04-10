import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { type Country, type Currency, COUNTRY_CURRENCY, CURRENCY_INFO } from '@/lib/currency'

type UserRole = 'BUYER' | 'SELLER' // ADMIN removed - cannot self-assign

// Valid countries and currencies — derived from the single source of truth
const VALID_COUNTRIES = Object.keys(COUNTRY_CURRENCY) as Country[]
const VALID_CURRENCIES = Object.keys(CURRENCY_INFO) as Currency[]

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { role, country, currency } = body

    // SECURITY FIX: Users can only set their own role to BUYER or SELLER
    // ADMIN/SUPER_ADMIN can only be assigned by existing admins via /api/admin/users
    if (role && !['BUYER', 'SELLER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be BUYER or SELLER' },
        { status: 400 }
      )
    }

    // Validate country
    if (country && !VALID_COUNTRIES.includes(country as Country)) {
      return NextResponse.json(
        { error: 'Invalid country. Must be UGANDA, KENYA, TANZANIA, or RWANDA' },
        { status: 400 }
      )
    }

    // Validate currency
    if (currency && !VALID_CURRENCIES.includes(currency as Currency)) {
      return NextResponse.json(
        { error: 'Invalid currency. Must be UGX, KES, TZS, or RWF' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    if (role) updateData.role = role as 'BUYER' | 'SELLER'
    if (country) updateData.country = country as Country
    if (currency) updateData.currency = currency as Currency

    // Update or create user in our database
    const updatedUser = await prisma.user.upsert({
      where: { clerkId: userId },
      create: {
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName,
        lastName: user.lastName,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
        avatar: user.imageUrl,
        role: (role as UserRole) || 'BUYER',
        // Default to UGANDA/UGX for new users who haven't selected a country yet;
        // these defaults match the platform's primary market.
        country: (country as Country) || 'UGANDA',
        currency: (currency as Currency) || 'UGX',
      },
      update: updateData
    })

    return NextResponse.json({ 
      success: true, 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        country: updatedUser.country,
        currency: updatedUser.currency,
      }
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        role: true,
        country: true,
        currency: true,
        name: true,
        avatar: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
