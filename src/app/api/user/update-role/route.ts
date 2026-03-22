import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Country, Currency, UserRole } from '@/types/enums'

// Valid countries and currencies
const VALID_COUNTRIES: Country[] = ['UGANDA', 'KENYA', 'TANZANIA', 'RWANDA']
const VALID_CURRENCIES: Currency[] = ['UGX', 'KES', 'TZS', 'RWF']

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

    // Validate role
    if (role && !['BUYER', 'SELLER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be BUYER, SELLER, or ADMIN' },
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
    
    if (role) updateData.role = role as UserRole
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
        country: (country as Country) || 'UGANDA',
        currency: (currency as Currency) || 'UGX',
      },
      update: updateData
    })

    return NextResponse.json({ 
      success: true, 
      User: {
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
