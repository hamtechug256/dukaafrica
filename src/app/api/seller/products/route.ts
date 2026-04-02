import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { canListMoreProducts, getStoreTier } from '@/lib/seller-tiers'

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

    // Enforce product tier limit (STARTER=10, VERIFIED=100, PREMIUM=unlimited)
    const currentProductCount = await prisma.product.count({
      where: { storeId: store.id }
    })
    const productCheck = await canListMoreProducts(store, currentProductCount)
    if (!productCheck.canList) {
      return NextResponse.json({
        error: 'Product limit reached',
        details: {
          maxProducts: productCheck.maxProducts,
          currentCount: currentProductCount,
          tier: store.verificationTier,
          message: `Your ${store.verificationTier} tier allows a maximum of ${productCheck.maxProducts} products. Please upgrade your plan to list more.`,
        }
      }, { status: 403 })
    }

    const body = await req.json()
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
    } = body

    // Enforce feature product tier permission
    if (isFeatured) {
      const tier = await getStoreTier(store)
      if (!tier.canFeatureProducts) {
        return NextResponse.json({
          error: 'Featured products require VERIFIED or PREMIUM tier',
          details: {
            currentTier: store.verificationTier,
            message: 'Please upgrade your plan to feature products on the homepage.',
          }
        }, { status: 403 })
      }
    }

    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

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
    const { id, submitForReview, variants, variantOptions, hasVariants, ...data } = body

    // Verify product belongs to store
    const existingProduct = await prisma.product.findFirst({
      where: { id, storeId: store.id },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Prepare update data — whitelist ONLY seller-editable fields to prevent mass assignment
    const ALLOWED_FIELDS = [
      'name', 'description', 'shortDesc', 'price', 'comparePrice', 'costPrice', 'sku',
      'quantity', 'lowStockThreshold', 'trackQuantity', 'allowBackorder',
      'freeShipping', 'weight', 'length', 'width', 'height',
      'images', 'categoryId', 'videos', 'variantOptions',
    ]
    const updateData: Record<string, any> = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in data) {
        updateData[field] = data[field]
      }
    }
    updateData.images = data.images ? JSON.stringify(data.images) : null
    updateData.categoryId = data.categoryId || null
    updateData.hasVariants = hasVariants ?? false
    updateData.variantOptions = variantOptions ? JSON.stringify(variantOptions) : null

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

    // Soft-delete: preserve data for existing orders/reviews
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
