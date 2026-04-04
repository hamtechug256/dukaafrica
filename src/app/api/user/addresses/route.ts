import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET user's addresses
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: { isDefault: 'desc' }
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

// POST create new address
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { label, fullName, phone, country, region, city, addressLine1, addressLine2, postalCode, isDefault } = body

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If this is default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }
      })
    }

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label,
        fullName,
        phone,
        country,
        region,
        city,
        addressLine1,
        addressLine2,
        postalCode,
        isDefault: isDefault || false,
      }
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error('Error creating address:', error)
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
  }
}

// PUT update address
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...data } = body

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id, userId: user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Whitelist allowed update fields to prevent mass-assignment
    const ALLOWED_UPDATE_FIELDS = ['label', 'fullName', 'phone', 'country', 'region', 'city', 'addressLine1', 'addressLine2', 'postalCode', 'isDefault']
    const updateData: Record<string, unknown> = {}
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in data) updateData[field] = data[field]
    }

    // If setting as default, unset others
    if (updateData.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }
      })
    }

    const address = await prisma.address.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error('Error updating address:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

// DELETE address
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Address ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id, userId: user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    await prisma.address.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting address:', error)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
