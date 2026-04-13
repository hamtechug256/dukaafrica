import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { canListMoreProducts, getStoreTier } from '@/lib/seller-tiers'

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ROW_COUNT = 500

// Generate unique slug
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const random = Math.random().toString(36).substring(2, 6)
  return `${base}-${random}`
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}

// Product input interface
interface ProductInput {
  name: string
  description?: string
  shortDesc?: string
  category?: string
  categoryId?: string | null
  price: number
  comparePrice?: number | null
  quantity?: number
  sku?: string
  images?: string[]
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  freeShipping?: boolean
  costPrice?: number | null
  isFeatured?: boolean
  trackQuantity?: boolean
  lowStockThreshold?: number | null
}

// POST /api/seller/products/bulk-upload - Bulk upload products from CSV or JSON array
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const store = await prisma.store.findFirst({
      where: { User: { clerkId: userId } },
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Check bulk upload tier permission
    const tier = await getStoreTier(store)
    if (!tier.canBulkUpload) {
      return NextResponse.json({
        error: 'Bulk upload not available on your current plan',
        details: {
          tier: store.verificationTier,
          message: `Your ${store.verificationTier} plan does not include bulk upload. Please upgrade your plan to enable this feature.`,
        }
      }, { status: 403 })
    }

    // Enforce product tier limit before processing batch
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
          message: `Your ${store.verificationTier} tier allows a maximum of ${productCheck.maxProducts} products. Please upgrade your plan.`,
        }
      }, { status: 403 })
    }

    // Check content type to determine input format
    const contentType = request.headers.get('content-type') || ''
    let products: ProductInput[] = []
    let submitForReview = false

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload (CSV)
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      }

      // Enforce file size limit
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        }, { status: 400 })
      }

      // Read file content
      const content = await file.text()
      const lines = content.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        return NextResponse.json(
          { error: 'CSV file must have header row and at least one data row' },
          { status: 400 }
        )
      }

      // Enforce row count limit
      const dataRowCount = lines.length - 1 // minus header
      if (dataRowCount > MAX_ROW_COUNT) {
        return NextResponse.json({
          error: `Too many products. Maximum ${MAX_ROW_COUNT} products per upload.`
        }, { status: 400 })
      }

      // Parse header
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

      // Expected columns (flexible matching)
      const columnMap: Record<string, string> = {
        'name': 'name',
        'productname': 'name',
        'title': 'name',
        'description': 'description',
        'desc': 'description',
        'shortdesc': 'shortDesc',
        'shortdescription': 'shortDesc',
        'price': 'price',
        'compareprice': 'comparePrice',
        'compareatprice': 'comparePrice',
        'originalprice': 'comparePrice',
        'costprice': 'costPrice',
        'cost': 'costPrice',
        'sku': 'sku',
        'quantity': 'quantity',
        'stock': 'quantity',
        'category': 'category',
        'categoryname': 'category',
        'images': 'images',
        'imageurls': 'images',
        'image': 'images',
        'weight': 'weight',
        'length': 'length',
        'width': 'width',
        'height': 'height',
        'categoryid': 'categoryId',
        'freeshipping': 'freeShipping',
        'isfeatured': 'isFeatured',
        'featured': 'isFeatured',
        'trackquantity': 'trackQuantity',
        'trackstock': 'trackQuantity',
        'lowstockthreshold': 'lowStockThreshold',
        'lowstockalert': 'lowStockThreshold',
      }

      // Map header indices to field names
      const fieldIndices: Record<string, number> = {}
      headers.forEach((header, index) => {
        const mappedField = columnMap[header]
        if (mappedField) {
          fieldIndices[mappedField] = index
        }
      })

      // Check required fields
      if (fieldIndices['name'] === undefined || fieldIndices['price'] === undefined) {
        return NextResponse.json(
          { error: 'CSV must have at least "name" and "price" columns' },
          { status: 400 }
        )
      }

      // Parse rows into products
      const getField = (values: string[], fieldName: string): string | undefined => {
        const idx = fieldIndices[fieldName]
        return idx !== undefined ? values[idx] : undefined
      }

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])

        // Parse images (comma-separated URLs)
        let images: string[] = []
        const imagesStr = getField(values, 'images')
        if (imagesStr) {
          images = imagesStr.split(/[,;]/).map(url => url.trim()).filter(Boolean)
        }

        const categoryValue = getField(values, 'category') || getField(values, 'categoryId') || ''

        products.push({
          name: getField(values, 'name') || '',
          description: getField(values, 'description') || '',
          shortDesc: getField(values, 'shortDesc') || '',
          category: categoryValue,
          categoryId: getField(values, 'categoryId') || null,
          price: getField(values, 'price') ? parseFloat(getField(values, 'price')!.replace(/[^0-9.]/g, '')) : 0,
          comparePrice: getField(values, 'comparePrice') ? parseFloat(getField(values, 'comparePrice')!.replace(/[^0-9.]/g, '')) : null,
          costPrice: getField(values, 'costPrice') ? parseFloat(getField(values, 'costPrice')!.replace(/[^0-9.]/g, '')) : null,
          quantity: getField(values, 'quantity') ? parseInt(getField(values, 'quantity')!.replace(/[^0-9]/g, '')) || 0 : 0,
          sku: getField(values, 'sku') || '',
          images,
          weight: getField(values, 'weight') ? parseFloat(getField(values, 'weight')!.replace(/[^0-9.]/g, '')) : null,
          length: getField(values, 'length') ? parseFloat(getField(values, 'length')!.replace(/[^0-9.]/g, '')) : null,
          width: getField(values, 'width') ? parseFloat(getField(values, 'width')!.replace(/[^0-9.]/g, '')) : null,
          height: getField(values, 'height') ? parseFloat(getField(values, 'height')!.replace(/[^0-9.]/g, '')) : null,
          freeShipping: getField(values, 'freeShipping')?.toLowerCase() === 'true',
          isFeatured: getField(values, 'isFeatured')?.toLowerCase() === 'true',
          trackQuantity: getField(values, 'trackQuantity')?.toLowerCase() !== 'false',
          lowStockThreshold: getField(values, 'lowStockThreshold') ? parseInt(getField(values, 'lowStockThreshold')!.replace(/[^0-9]/g, '')) || 5 : 5,
        })
      }
    } else if (contentType.includes('application/json')) {
      // Handle JSON array of products
      const body = await request.json()

      if (!body.products || !Array.isArray(body.products)) {
        return NextResponse.json(
          { error: 'Request body must contain a "products" array' },
          { status: 400 }
        )
      }

      // Enforce row count limit
      if (body.products.length > MAX_ROW_COUNT) {
        return NextResponse.json({
          error: `Too many products. Maximum ${MAX_ROW_COUNT} products per upload.`
        }, { status: 400 })
      }

      products = body.products.map((p: any) => ({
        name: p.name || '',
        description: p.description || '',
        shortDesc: p.shortDesc || '',
        category: p.category || '',
        categoryId: p.categoryId || null,
        price: p.price || 0,
        comparePrice: p.comparePrice || null,
        costPrice: p.costPrice || null,
        quantity: p.quantity || 0,
        sku: p.sku || '',
        images: Array.isArray(p.images) ? p.images : [],
        weight: p.weight || null,
        length: p.length || null,
        width: p.width || null,
        height: p.height || null,
        freeShipping: p.freeShipping || false,
        isFeatured: p.isFeatured || false,
        trackQuantity: p.trackQuantity !== undefined ? p.trackQuantity : true,
        lowStockThreshold: p.lowStockThreshold || 5,
      }))

      // Check if seller wants to auto-submit for review
      submitForReview = body.submitForReview === true
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use multipart/form-data for file upload or application/json for array.' },
        { status: 400 }
      )
    }

    // Get all categories for matching
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    })

    // Results tracking
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; error: string; productName?: string }[],
      products: [] as { id: string; name: string; price: number }[],
    }

    // Track remaining slots for tier limit enforcement
    let remainingSlots = productCheck.remaining === -1 ? Infinity : productCheck.remaining

    // Process each product inside a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < products.length; i++) {
        const product = products[i]
        const rowNum = i + 1

        // Check tier limit before each product
        if (remainingSlots <= 0) {
          results.failed++
          results.errors.push({
            row: rowNum,
            error: 'Product limit reached for your tier',
            productName: product.name
          })
          continue
        }

        try {
          if (!product.name || product.name.trim() === '') {
            results.failed++
            results.errors.push({ row: rowNum, error: 'Product name is required', productName: product.name })
            continue
          }

          if (!product.price || product.price <= 0) {
            results.failed++
            results.errors.push({ row: rowNum, error: 'Price must be a positive number', productName: product.name })
            continue
          }

          // Validate quantity if provided
          if (product.quantity !== undefined && product.quantity !== null && (product.quantity < 0 || !Number.isInteger(product.quantity))) {
            results.failed++
            results.errors.push({ row: rowNum, error: 'Quantity must be a non-negative integer', productName: product.name })
            continue
          }

          // Find or match category
          let categoryId: string | null = product.categoryId || null
          if (product.category && !categoryId) {
            const matchedCategory = categories.find(
              c => c.name.toLowerCase() === product.category!.toLowerCase()
            )
            categoryId = matchedCategory?.id || null
          }

          // Validate review requirements if auto-submitting
          if (submitForReview) {
            if (!product.description || product.description.trim() === '') {
              results.failed++
              results.errors.push({ row: rowNum, error: 'Description is required when submitting for review', productName: product.name })
              continue
            }
            if (!product.images || product.images.length === 0) {
              results.failed++
              results.errors.push({ row: rowNum, error: 'At least one image is required when submitting for review', productName: product.name })
              continue
            }
          }

          // Create product
          const newProduct = await tx.product.create({
            data: {
              storeId: store.id,
              name: product.name,
              slug: generateSlug(product.name),
              description: product.description || '',
              shortDesc: product.shortDesc || null,
              price: product.price,
              comparePrice: product.comparePrice || null,
              costPrice: product.costPrice || null,
              sku: product.sku || null,
              quantity: product.quantity || 0,
              weight: product.weight || null,
              length: product.length || null,
              width: product.width || null,
              height: product.height || null,
              images: product.images && product.images.length > 0 ? JSON.stringify(product.images) : null,
              freeShipping: product.freeShipping || false,
              categoryId,
              isFeatured: product.isFeatured || false,
              trackQuantity: product.trackQuantity !== undefined ? product.trackQuantity : true,
              lowStockThreshold: product.lowStockThreshold || 5,
              status: 'DRAFT',
              submittedForReview: submitForReview,
            },
          })

          results.success++
          results.products.push({
            id: newProduct.id,
            name: newProduct.name,
            price: toNum(newProduct.price),
          })
          remainingSlots--
        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: rowNum,
            error: error.message || 'Unknown error',
            productName: product.name
          })
        }
      }
    }, {
      timeout: 60000, // 60s timeout for large batches
    })

    return NextResponse.json({
      message: `Bulk upload complete: ${results.success} products created, ${results.failed} failed`,
      results,
    })
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    )
  }
}
