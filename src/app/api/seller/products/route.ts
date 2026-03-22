import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const variantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().optional(),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').optional(),
  image: z.string().url().optional().nullable(),
  options: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
})

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Name too long'),
  description: z.string().max(5000).optional(),
  shortDesc: z.string().max(300).optional(),
  categoryId: z.string().optional().nullable(),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().optional(),
  costPrice: z.number().optional(),
  sku: z.string().max(100).optional(),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  trackQuantity: z.boolean().optional(),
  freeShipping: z.boolean().optional(),
  weight: z.number().positive().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(z.string().url('Invalid image URL')).max(10, 'Maximum 10 images allowed').optional(),
  variants: z.array(variantSchema).optional(),
})

const updateProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  shortDesc: z.string().max(300).optional(),
  categoryId: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  comparePrice: z.number().optional(),
  costPrice: z.number().optional(),
  sku: z.string().max(100).optional(),
  quantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  trackQuantity: z.boolean().optional(),
  freeShipping: z.boolean().optional(),
  weight: z.number().positive().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(z.string().url()).max(10).optional(),
  submitForReview: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
  variantOptions: z.record(z.string(), z.any()).optional(),
  variants: z.array(variantSchema).optional(),
})

// Generate unique slug
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const random = Math.random().toString(36).substring(2, 6)
  return `${base}-${random}`
}

// GET - Fetch seller's products
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const products = await prisma.product.findMany({
      where: { storeId: store.id },
      include: {
        Category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST - Create new product
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await req.json()
    
    // Validate input with Zod
    const validationResult = createProductSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      name,
      description,
      shortDesc,
      categoryId,
      price,
      comparePrice,
      costPrice,
      sku,
      quantity,
      lowStockThreshold,
      trackQuantity,
      freeShipping,
      weight,
      length,
      width,
      height,
      status,
      isFeatured,
      images,
      variants,
    } = validationResult.data

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        name,
        slug: generateSlug(name),
        description,
        shortDesc,
        categoryId: categoryId || null,
        price,
        comparePrice,
        costPrice,
        sku,
        quantity: quantity || 0,
        lowStockThreshold: lowStockThreshold || 5,
        trackQuantity: trackQuantity ?? true,
        freeShipping: freeShipping ?? false,
        weight,
        length,
        width,
        height,
        status: status || 'DRAFT',
        isFeatured: isFeatured ?? false,
        images: images && images.length > 0 ? JSON.stringify(images) : null,
        hasVariants: variants && variants.length > 0,
      },
      include: {
        Category: true,
      },
    })

    // Create variants if any
    if (variants && variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map((v: any) => ({
          productId: product.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          comparePrice: v.comparePrice,
          quantity: v.quantity,
          options: JSON.stringify(v.options),
          isActive: true,
        })),
      })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// PUT - Update product
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await req.json()
    
    // Validate input with Zod
    const validationResult = updateProductSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { id, submitForReview, variants, variantOptions, hasVariants, ...data } = validationResult.data

    // Verify product belongs to store
    const existingProduct = await prisma.product.findFirst({
      where: { id, storeId: store.id },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Prepare update data with proper typing
    const updateData: Record<string, unknown> = {}
    
    // Only include fields that were provided
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.shortDesc !== undefined) updateData.shortDesc = data.shortDesc
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.price !== undefined) updateData.price = data.price
    if (data.comparePrice !== undefined) updateData.comparePrice = data.comparePrice
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice
    if (data.sku !== undefined) updateData.sku = data.sku
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold
    if (data.trackQuantity !== undefined) updateData.trackQuantity = data.trackQuantity
    if (data.freeShipping !== undefined) updateData.freeShipping = data.freeShipping
    if (data.weight !== undefined) updateData.weight = data.weight
    if (data.length !== undefined) updateData.length = data.length
    if (data.width !== undefined) updateData.width = data.width
    if (data.height !== undefined) updateData.height = data.height
    if (data.status !== undefined) updateData.status = data.status
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
    
    // Handle images
    if (data.images !== undefined) {
      updateData.images = data.images.length > 0 ? JSON.stringify(data.images) : null
    }
    
    // Handle variants
    updateData.hasVariants = hasVariants ?? false
    if (variantOptions !== undefined) {
      updateData.variantOptions = variantOptions ? JSON.stringify(variantOptions) : null
    }

    // Handle submit for review
    if (submitForReview) {
      // Validate product has required fields before submitting
      const requiredFields = ['name', 'description', 'price']
      const missingFields = requiredFields.filter(field => !existingProduct[field as keyof typeof existingProduct])
      
      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Cannot submit for review. Missing required fields: ${missingFields.join(', ')}` },
          { status: 400 }
        )
      }

      if (!existingProduct.images) {
        return NextResponse.json(
          { error: 'Cannot submit for review. Product must have at least one image.' },
          { status: 400 }
        )
      }

      updateData.submittedForReview = true
      updateData.status = 'DRAFT' // Keep as draft until approved
      updateData.rejectionReason = null // Clear any previous rejection
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    })

    // Handle variants update
    if (hasVariants && variants && variants.length > 0) {
      // Delete existing variants
      await prisma.productVariant.deleteMany({
        where: { productId: id },
      })

      // Create new variants
      await prisma.productVariant.createMany({
        data: variants.map((v: any) => ({
          productId: id,
          name: v.name,
          sku: v.sku || null,
          price: v.price,
          comparePrice: v.comparePrice || null,
          quantity: v.quantity || 0,
          image: v.image || null,
          options: JSON.stringify(v.options),
          isActive: v.isActive ?? true,
        })),
      })
    } else if (!hasVariants) {
      // Delete all variants if hasVariants is false
      await prisma.productVariant.deleteMany({
        where: { productId: id },
      })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE - Delete product
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then find the store by userId
    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    // Verify product belongs to store
    const product = await prisma.product.findFirst({
      where: { id, storeId: store.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
