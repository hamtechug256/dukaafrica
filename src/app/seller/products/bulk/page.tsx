'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  Download,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Edit,
  ChevronLeft,
  Package,
  FileText,
  Check,
} from 'lucide-react'
import { formatPrice } from '@/lib/currency'

// Types
interface ParsedProduct {
  id: string
  name: string
  description: string
  shortDesc: string
  category: string
  categoryId: string | null
  price: number | null
  comparePrice: number | null
  costPrice: number | null
  quantity: number
  sku: string
  images: string[]
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  freeShipping: boolean
  isFeatured: boolean
  trackQuantity: boolean
  lowStockThreshold: number
  errors: string[]
  isValid: boolean
}

interface UploadResult {
  success: number
  failed: number
  errors: { row: number; error: string; productName?: string }[]
  products: { id: string; name: string; price: number }[]
}

interface Category {
  id: string
  name: string
  slug: string
}

// Step types
type Step = 'upload' | 'validate' | 'preview' | 'uploading' | 'results'

// CSV Template
const CSV_TEMPLATE = `name,description,shortDesc,category,price,comparePrice,costPrice,quantity,sku,images,weight,length,width,height,freeShipping,isFeatured,trackQuantity,lowStockThreshold
iPhone 15 Pro,Latest iPhone model with A17 Pro chip,Apple iPhone 15 Pro,Electronics,4500000,5000000,4000000,10,IPHONE15PRO,https://example.com/image1.jpg;https://example.com/image2.jpg,0.2,15,7,0.8,false,false,true,5
Samsung Galaxy S24,Android flagship phone with 200MP camera,Samsung Galaxy S24,Electronics,3500000,,3000000,15,SAMS24,https://example.com/image2.jpg,0.18,14,7,0.7,false,false,true,5`

// JSON Template
const JSON_TEMPLATE = [
  {
    name: "iPhone 15 Pro",
    description: "Latest iPhone model with A17 Pro chip. Includes USB-C charging, titanium design, and the powerful A17 Pro chip for gaming and creative workflows.",
    shortDesc: "Apple iPhone 15 Pro",
    category: "Electronics",
    price: 4500000,
    comparePrice: 5000000,
    costPrice: 4000000,
    quantity: 10,
    sku: "IPHONE15PRO",
    images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    weight: 0.2,
    length: 15,
    width: 7,
    height: 0.8,
    freeShipping: false,
    isFeatured: false,
    trackQuantity: true,
    lowStockThreshold: 5
  }
]

// Generate unique ID for client-side tracking
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
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

// Parse CSV content
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(line => parseCSVLine(line))

  return { headers, rows }
}

// Normalize header name
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Map headers to fields
function mapHeadersToFields(headers: string[]): Record<string, number> {
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

  const fieldIndices: Record<string, number> = {}
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)
    const mappedField = columnMap[normalized]
    if (mappedField) {
      fieldIndices[mappedField] = index
    }
  })

  return fieldIndices
}

// Parse image URLs from string or array
function parseImages(value: string | string[] | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return value.split(/[,;]/).map(url => url.trim()).filter(Boolean)
}

// Validate product
function validateProduct(product: ParsedProduct, categories: Category[], submittingForReview: boolean = false): string[] {
  const errors: string[] = []

  // Required fields
  if (!product.name || product.name.trim() === '') {
    errors.push('Product name is required')
  }

  if (product.price === null || product.price === undefined) {
    errors.push('Price is required')
  } else if (product.price <= 0) {
    errors.push('Price must be a positive number')
  }

  if (product.quantity === undefined || product.quantity === null) {
    errors.push('Quantity is required')
  } else if (product.quantity < 0 || !Number.isInteger(product.quantity)) {
    errors.push('Quantity must be a non-negative integer')
  }

  // Category validation
  if (product.category) {
    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === product.category.toLowerCase()
    )
    if (!matchedCategory && !product.categoryId) {
      errors.push(`Category "${product.category}" not found`)
    }
  }

  // Compare price validation
  if (product.comparePrice !== null && product.comparePrice !== undefined) {
    if (product.comparePrice <= 0) {
      errors.push('Compare price must be a positive number')
    } else if (product.price && product.comparePrice <= product.price) {
      errors.push('Compare price should be greater than the selling price')
    }
  }

  // Cost price validation
  if (product.costPrice !== null && product.costPrice !== undefined) {
    if (product.costPrice < 0) {
      errors.push('Cost price cannot be negative')
    }
  }

  // Image URL validation
  if (product.images.length > 0) {
    const invalidUrls = product.images.filter(url => {
      try {
        new URL(url)
        return false
      } catch {
        return true
      }
    })
    if (invalidUrls.length > 0) {
      errors.push(`Invalid image URLs: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? ` (+${invalidUrls.length - 3} more)` : ''}`)
    }
  }

  // Extra validation when submitting for review
  if (submittingForReview) {
    if (!product.description || product.description.trim() === '') {
      errors.push('Description is required when submitting for review')
    }
    if (product.images.length === 0) {
      errors.push('At least one image is required when submitting for review')
    }
  }

  return errors
}

// Fetch categories
async function fetchCategories(): Promise<{ categories: Category[] }> {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export default function BulkUploadPage() {
  const [step, setStep] = useState<Step>('upload')
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [editingProduct, setEditingProduct] = useState<ParsedProduct | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [submitForReview, setSubmitForReview] = useState(false)
  const [submittingForReview, setSubmittingForReview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Fetch store currency for dynamic price display
  const [storeCurrency, setStoreCurrency] = useState('UGX')
  useEffect(() => {
    fetch('/api/seller/store')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.store?.currency) setStoreCurrency(data.store.currency) })
      .catch(() => {})
  }, [])

  // Fetch categories for mapping
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const categories = categoriesData?.categories || []

  // Parse file content
  const parseFile = useCallback((content: string, fileName: string) => {
    setParseError(null)

    try {
      const isJSON = fileName.toLowerCase().endsWith('.json')
      let parsedProducts: ParsedProduct[] = []

      if (isJSON) {
        // Parse JSON
        const data = JSON.parse(content)
        const items = Array.isArray(data) ? data : [data]

        parsedProducts = items.map((item: any, index: number) => ({
          id: generateId(),
          name: item.name || '',
          description: item.description || '',
          shortDesc: item.shortDesc || item.shortDescription || '',
          category: item.category || item.categoryName || '',
          categoryId: item.categoryId || null,
          price: item.price ? parseFloat(item.price) : null,
          comparePrice: item.comparePrice ? parseFloat(item.comparePrice) : null,
          costPrice: item.costPrice ? parseFloat(item.costPrice) : null,
          quantity: item.quantity !== undefined ? parseInt(item.quantity) : 0,
          sku: item.sku || '',
          images: parseImages(item.images),
          weight: item.weight ? parseFloat(item.weight) : null,
          length: item.length ? parseFloat(item.length) : null,
          width: item.width ? parseFloat(item.width) : null,
          height: item.height ? parseFloat(item.height) : null,
          freeShipping: item.freeShipping === true || item.freeShipping === 'true',
          isFeatured: item.isFeatured === true || item.isFeatured === 'true',
          trackQuantity: item.trackQuantity !== false && item.trackQuantity !== 'false',
          lowStockThreshold: item.lowStockThreshold ? parseInt(item.lowStockThreshold) : 5,
          errors: [],
          isValid: false,
        }))
      } else {
        // Parse CSV
        const { headers, rows } = parseCSV(content)

        if (headers.length === 0) {
          throw new Error('CSV file is empty or invalid')
        }

        const fieldIndices = mapHeadersToFields(headers)

        // Check for required columns
        if (fieldIndices['name'] === undefined) {
          throw new Error('CSV must have a "name" column')
        }
        if (fieldIndices['price'] === undefined) {
          throw new Error('CSV must have a "price" column')
        }

        const getField = (values: string[], fieldName: string): string | undefined => {
          const idx = fieldIndices[fieldName]
          return idx !== undefined ? values[idx] : undefined
        }

        parsedProducts = rows.map((values, index) => {
          const categoryValue = getField(values, 'category') || getField(values, 'categoryId') || ''

          return {
            id: generateId(),
            name: getField(values, 'name') || '',
            description: getField(values, 'description') || '',
            shortDesc: getField(values, 'shortDesc') || '',
            category: categoryValue,
            categoryId: getField(values, 'categoryId') || null,
            price: getField(values, 'price') ? parseFloat(getField(values, 'price')!.replace(/[^0-9.]/g, '')) : null,
            comparePrice: getField(values, 'comparePrice') ? parseFloat(getField(values, 'comparePrice')!.replace(/[^0-9.]/g, '')) : null,
            costPrice: getField(values, 'costPrice') ? parseFloat(getField(values, 'costPrice')!.replace(/[^0-9.]/g, '')) : null,
            quantity: getField(values, 'quantity') ? parseInt(getField(values, 'quantity')!.replace(/[^0-9]/g, '')) : 0,
            sku: getField(values, 'sku') || '',
            images: parseImages(getField(values, 'images') || ''),
            weight: getField(values, 'weight') ? parseFloat(getField(values, 'weight')!.replace(/[^0-9.]/g, '')) : null,
            length: getField(values, 'length') ? parseFloat(getField(values, 'length')!.replace(/[^0-9.]/g, '')) : null,
            width: getField(values, 'width') ? parseFloat(getField(values, 'width')!.replace(/[^0-9.]/g, '')) : null,
            height: getField(values, 'height') ? parseFloat(getField(values, 'height')!.replace(/[^0-9.]/g, '')) : null,
            freeShipping: getField(values, 'freeShipping')?.toLowerCase() === 'true',
            isFeatured: getField(values, 'isFeatured')?.toLowerCase() === 'true',
            trackQuantity: getField(values, 'trackQuantity')?.toLowerCase() !== 'false',
            lowStockThreshold: getField(values, 'lowStockThreshold') ? parseInt(getField(values, 'lowStockThreshold')!.replace(/[^0-9]/g, '')) || 5 : 5,
            errors: [],
            isValid: false,
          }
        })
      }

      // Enforce row limit before validation
      const maxRows = 500
      if (parsedProducts.length > maxRows) {
        setParseError(`File contains ${parsedProducts.length} products. Maximum allowed is ${maxRows} per upload. Please split into smaller files.`)
        return
      }

      // Validate all products
      const validatedProducts = parsedProducts.map(product => {
        const errors = validateProduct(product, categories, submitForReview)

        // Resolve category ID
        let categoryId = product.categoryId
        if (product.category && !categoryId) {
          const matchedCategory = categories.find(
            c => c.name.toLowerCase() === product.category.toLowerCase()
          )
          categoryId = matchedCategory?.id || null
        }

        return {
          ...product,
          categoryId,
          errors,
          isValid: errors.length === 0,
        }
      })

      setProducts(validatedProducts)

      if (validatedProducts.length === 0) {
        setParseError('No products found in the file')
        return
      }

      setStep('validate')
    } catch (error: any) {
      setParseError(error.message || 'Failed to parse file')
    }
  }, [categories])

  // Validate file before parsing (size + type + row limit guard)
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const maxRows = 500
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (!ext || !['csv', 'json'].includes(ext)) {
      return 'Only CSV and JSON files are supported. Please upload a .csv or .json file.'
    }
    if (file.size > maxSize) {
    return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`
    }
    // For CSV, do a quick row count check
    if (ext === 'csv' && file.size > 50000) {
      // Rough estimate: ~100 bytes per row average
    const estimatedRows = Math.ceil(file.size / 100)
    if (estimatedRows > maxRows + 50) {
      return `File may contain more than ${maxRows} products. Maximum allowed is ${maxRows} per upload. Please split into smaller files.`
    }
    }
    return null
  }

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      const error = validateFile(file)
      if (error) {
        setParseError(error)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        parseFile(content, file.name)
      }
      reader.readAsText(file)
    }
  }, [parseFile])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const error = validateFile(file)
      if (error) {
        setParseError(error)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        parseFile(content, file.name)
      }
      reader.readAsText(file)
    }
  }

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Remove product
  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id))
  }

  // Remove invalid products
  const removeInvalidProducts = () => {
    setProducts(products.filter(p => p.isValid))
  }

  // Update product
  const updateProduct = (updatedProduct: ParsedProduct) => {
    const errors = validateProduct(updatedProduct, categories, submitForReview)

    // Resolve category ID
    let categoryId = updatedProduct.categoryId
    if (updatedProduct.category && !categoryId) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === updatedProduct.category.toLowerCase()
      )
      categoryId = matchedCategory?.id || null
    }

    setProducts(products.map(p =>
      p.id === updatedProduct.id
        ? { ...updatedProduct, categoryId, errors, isValid: errors.length === 0 }
        : p
    ))
    setEditingProduct(null)
  }

  // Upload products
  const uploadProducts = async () => {
    setStep('uploading')
    setUploadProgress(0)

    const validProducts = products.filter(p => p.isValid)

    if (validProducts.length === 0) {
      setUploadResult({
        success: 0,
        failed: products.length,
        errors: products.map((p, i) => ({ row: i + 1, error: 'Invalid product data', productName: p.name })),
        products: [],
      })
      setStep('results')
      return
    }

    try {
      const res = await fetch('/api/seller/products/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: validProducts, submitForReview }),
      })

      const data = await res.json()

      if (!res.ok) {
        // API returned an error (tier, limit, etc.)
        setUploadResult({
          success: 0,
          failed: validProducts.length,
          errors: [{ row: 0, error: data.error || `Upload failed (${res.status})` }],
          products: [],
        })
        setStep('results')
        return
      }

      setUploadProgress(100)

      setUploadResult({
        success: data.results?.success || 0,
        failed: data.results?.failed || 0,
        errors: data.results?.errors || [],
        products: data.results?.products || [],
      })

      queryClient.invalidateQueries({ queryKey: ['seller-products'] })
      setStep('results')
    } catch (error: any) {
      setUploadResult({
        success: 0,
        failed: validProducts.length,
        errors: [{ row: 0, error: error.message || 'Upload failed. Check your connection and try again.' }],
        products: [],
      })
      setStep('results')
    }
  }

  // Download template
  const downloadTemplate = (type: 'csv' | 'json') => {
    const content = type === 'csv'
      ? CSV_TEMPLATE
      : JSON.stringify(JSON_TEMPLATE, null, 2)

    const blob = new Blob([content], { type: type === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `product-template.${type}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Stats
  const validCount = products.filter(p => p.isValid).length
  const invalidCount = products.filter(p => !p.isValid).length

  // Render steps
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/seller/products" className="text-gray-500 hover:text-gray-700">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Upload Products</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Upload multiple products via CSV or JSON file
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {['upload', 'validate', 'preview', 'results'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${step === s ? 'bg-primary text-primary-foreground' :
                    ['validate', 'preview', 'results'].indexOf(step) > i ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'}
                `}>
                  {['validate', 'preview', 'results'].indexOf(step) > i ? (
                    <Check className="w-4 h-4" />
                  ) : i + 1}
                </div>
                <span className={`ml-2 text-sm capitalize ${
                  step === s ? 'text-primary font-medium' : 'text-gray-500'
                }`}>
                  {s === 'upload' ? 'Upload File' :
                   s === 'validate' ? 'Validate' :
                   s === 'preview' ? 'Preview' : 'Results'}
                </span>
                {i < 3 && <ArrowRight className="w-4 h-4 mx-4 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Template Downloads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Download Templates
                </CardTitle>
                <CardDescription>
                  Download a template file to see the required format for bulk upload
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => downloadTemplate('csv')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                  <Button variant="outline" onClick={() => downloadTemplate('json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Download JSON Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Your File</CardTitle>
                <CardDescription>
                  Drag and drop your CSV or JSON file, or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`
                    relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                    transition-colors
                    ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports CSV and JSON files (max 10MB)
                  </p>
                </div>

                {parseError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Parse Error</AlertTitle>
                    <AlertDescription>{parseError}</AlertDescription>
                  </Alert>
                )}

                {/* Required Fields Info */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">name</span> - Product name (required)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">price</span> - Selling price (required, positive number)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">quantity</span> - Stock quantity (required, non-negative integer)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">category</span> - Category name (must match an existing category exactly)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">images</span> - Image URLs separated by semicolons (;) — <span className="text-amber-600">required for review submission</span></li>
                  </ul>
                  <h4 className="font-medium mt-4 mb-2">Optional Fields:</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">description</span> - Full product description — <span className="text-amber-600">required for review submission</span></li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">shortDesc</span> - Short description (max 150 characters)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">comparePrice</span> - Original/crossed-out price (must be higher than price)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">costPrice</span> - Your cost per item (for profit tracking)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">sku</span> - Stock keeping unit identifier</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">freeShipping</span> - true/false (default: false)</li>
                    <li><span className="font-medium text-gray-900 dark:text-gray-200">weight/length/width/height</span> - Shipping dimensions</li>
                  </ul>
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Image Tips:</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-400 mt-1 space-y-1">
                      <li>Use direct image URLs (e.g., from your hosting, Cloudinary, Imgur, etc.)</li>
                      <li>Separate multiple images with semicolons: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">url1.jpg;url2.jpg;url3.jpg</code></li>
                      <li>Use landscape images (4:3 ratio) for best display on product cards</li>
                      <li>First image is used as the main product thumbnail</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Validate Step */}
        {step === 'validate' && (
          <div className="space-y-6">
            {/* Validation Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
                      <p className="text-2xl font-bold">{products.length}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Valid Products</p>
                      <p className="text-2xl font-bold text-green-600">{validCount}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Invalid Products</p>
                      <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Errors */}
            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors Found</AlertTitle>
                <AlertDescription>
                  {invalidCount} product(s) have validation errors. Please fix or remove them before proceeding.
                </AlertDescription>
              </Alert>
            )}

            {/* Products Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Products Preview</CardTitle>
                  <div className="flex gap-2">
                    {invalidCount > 0 && (
                      <Button variant="outline" size="sm" onClick={removeInvalidProducts}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Invalid
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Errors</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id} className={!product.isValid ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <TableCell>
                            {product.isValid ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium line-clamp-1">{product.name || '—'}</p>
                              {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{product.category || '—'}</span>
                          </TableCell>
                          <TableCell>
                            {product.price ? formatPrice(product.price, storeCurrency) : '—'}
                          </TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>
                            {product.errors.length > 0 && (
                              <div className="text-sm text-red-600 dark:text-red-400">
                                {product.errors.slice(0, 2).map((e, i) => (
                                  <p key={i} className="line-clamp-1">• {e}</p>
                                ))}
                                {product.errors.length > 2 && (
                                  <p>+{product.errors.length - 2} more</p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingProduct(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProduct(product.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Upload
              </Button>
              <Button onClick={() => setStep('preview')} disabled={validCount === 0}>
                Continue to Preview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ready to Upload</CardTitle>
                <CardDescription>
                  Review your {validCount} valid products before uploading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Compare Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Images</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.filter(p => p.isValid).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{product.category || '—'}</TableCell>
                          <TableCell>{product.price != null ? formatPrice(product.price, storeCurrency) : '—'}</TableCell>
                          <TableCell>
                            {product.comparePrice ? formatPrice(product.comparePrice, storeCurrency) : '—'}
                          </TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>
                            {product.images.length > 0 ? (
                              <Badge variant="secondary">{product.images.length} image(s)</Badge>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Submit for Review Toggle */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="submitForReview"
                      checked={submitForReview}
                      onChange={(e) => {
                        setSubmitForReview(e.target.checked)
                        // Re-validate with new flag
                        const revalidated = products.map(product => {
                          const errors = validateProduct(product, categories, e.target.checked)
                          let categoryId = product.categoryId
                          if (product.category && !categoryId) {
                            const matchedCategory = categories.find(
                              c => c.name.toLowerCase() === product.category.toLowerCase()
                            )
                            categoryId = matchedCategory?.id || null
                          }
                          return { ...product, categoryId, errors, isValid: errors.length === 0 }
                        })
                        setProducts(revalidated)
                      }}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <label htmlFor="submitForReview" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                        Submit all products for review after creation
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        When enabled, all products will be automatically submitted for admin review after upload.
                        This requires each product to have a description and at least one image.
                        Products without these will be created as drafts but won't be submitted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>
                    {submitForReview
                      ? 'Products with description and images will be created and immediately submitted for admin review.'
                      : 'Products will be created as drafts. You can submit them for review later from your products list.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('validate')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Validation
              </Button>
              <Button onClick={uploadProducts}>
                Upload {validCount} Products
                <Upload className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Uploading Step */}
        {step === 'uploading' && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                <h3 className="text-lg font-medium mb-2">Uploading Products...</h3>
                <p className="text-gray-500 mb-6">Please wait while we process your products</p>
                <Progress value={uploadProgress} className="max-w-md mx-auto" />
                <p className="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Step */}
        {step === 'results' && uploadResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Processed</p>
                      <p className="text-2xl font-bold">{products.length}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                      <p className="text-2xl font-bold text-green-600">{uploadResult.success}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className={uploadResult.failed > 0 ? 'border-red-200 dark:border-red-800' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                    </div>
                    <XCircle className={`w-8 h-8 ${uploadResult.failed > 0 ? 'text-red-500' : 'text-gray-300'}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Errors */}
            {uploadResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadResult.errors.map((error, i) => (
                          <TableRow key={i}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.productName || '—'}</TableCell>
                            <TableCell className="text-red-600">{error.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => {
                  setStep('upload')
                  setProducts([])
                  setUploadResult(null)
                  setParseError(null)
                }}>
                  Upload More Products
                </Button>
                {/* Submit for Review button — only show if products were created and NOT already auto-submitted */}
                {!submitForReview && uploadResult.success > 0 && (
                  <Button
                    variant="default"
                    onClick={async () => {
                      setSubmittingForReview(true)
                      try {
                        const productIds = uploadResult.products.map(p => p.id)
                        const res = await fetch('/api/seller/products/bulk-submit-review', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ productIds }),
                        })
                        const data = await res.json()
                        if (res.ok) {
                          setUploadResult(prev => prev ? {
                            ...prev,
                            submittedForReview: data.submitted,
                            skippedForReview: data.skipped,
                          } : prev)
                        }
                      } catch (error) {
                        // silently fail — seller can still submit individually
                      }
                      setSubmittingForReview(false)
                    }}
                    disabled={submittingForReview}
                  >
                    {submittingForReview ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Submit {uploadResult.success} for Review
                      </>
                    )}
                  </Button>
                )}
              </div>
              <Link href="/seller/products">
                <Button>
                  View All Products
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Submission Result Info */}
            {submitForReview && uploadResult.success > 0 && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-300">Auto-Submitted for Review</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  All {uploadResult.success} products were created and submitted for admin review. You'll be notified once they're approved.
                </AlertDescription>
              </Alert>
            )}
            {!submitForReview && (uploadResult as any).submittedForReview > 0 && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-300">Submitted for Review</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {(uploadResult as any).submittedForReview} products were submitted for admin review.
                  {(uploadResult as any).skippedForReview > 0 && ` ${(uploadResult as any).skippedForReview} products were skipped because they're missing a description or image.`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Fix validation errors for this product
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input
                  id="shortDesc"
                  value={editingProduct.shortDesc}
                  onChange={(e) => setEditingProduct({ ...editingProduct, shortDesc: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={editingProduct.category}
                  onValueChange={(value) => setEditingProduct({ ...editingProduct, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price ({storeCurrency}) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label htmlFor="comparePrice">Compare Price</Label>
                  <Input
                    id="comparePrice"
                    type="number"
                    value={editingProduct.comparePrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, comparePrice: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    value={editingProduct.costPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Your cost per item"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="images">Image URLs (semicolon-separated)</Label>
                <Textarea
                  id="images"
                  value={editingProduct.images.join('; ')}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: e.target.value.split(/[;,]/).map(s => s.trim()).filter(Boolean) })}
                  rows={2}
                  placeholder="https://example.com/image1.jpg; https://example.com/image2.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={editingProduct.quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="freeShipping" className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="freeShipping"
                      checked={editingProduct.freeShipping}
                      onChange={(e) => setEditingProduct({ ...editingProduct, freeShipping: e.target.checked })}
                      className="rounded"
                    />
                    Free Shipping
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={editingProduct.weight || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label htmlFor="length">Length (cm)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    value={editingProduct.length || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, length: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (cm)</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={editingProduct.width || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, width: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={editingProduct.height || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, height: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>

              {/* Current Errors */}
              {editingProduct.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1">
                      {editingProduct.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={() => updateProduct(editingProduct!)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
