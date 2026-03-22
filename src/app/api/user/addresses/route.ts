import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createAddressSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OFFICE', 'OTHER']).optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Valid phone number is required').max(15),
  country: z.string().min(1, 'Country is required'),
  region: z.string().min(1, 'Region is required'),
  city: z.string().min(1, 'City is required'),
  addressLine1: z.string().min(5, 'Address is required').max(200),
  addressLine2: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
})

const updateAddressSchema = z.object({
  id: z.string().min(1, 'Address ID is required'),
  label: z.enum(['HOME', 'WORK', 'OFFICE', 'OTHER']).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  country: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  addressLine1: z.string().min(5).max(200).optional(),
  addressLine2: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
})

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
    
    // Validate input with Zod
    const validationResult = createAddressSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { label, fullName, phone, country, region, city, addressLine1, addressLine2, postalCode, isDefault } = validationResult.data

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
    
    // Validate input with Zod
    const validationResult = updateAddressSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { id, ...data } = validationResult.data

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

    // If setting as default, unset others
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }
      })
    }

    // Only update fields that were provided
    const updateData: Record<string, unknown> = {}
    if (data.label !== undefined) updateData.label = data.label
    if (data.fullName !== undefined) updateData.fullName = data.fullName
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.country !== undefined) updateData.country = data.country
    if (data.region !== undefined) updateData.region = data.region
    if (data.city !== undefined) updateData.city = data.city
    if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1
    if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

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
