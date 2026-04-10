'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Package, 
  DollarSign, 
  Image, 
  Tag, 
  Truck, 
  Save, 
  Loader2,
  Plus,
  X,
  ChevronDown,
  Layers
} from 'lucide-react'
import { VariantManager, VariantOption, ProductVariant } from '@/components/products/variant-manager'
import { formatPrice } from '@/lib/currency'

async function fetchCategories() {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchStore() {
  const res = await fetch('/api/seller/store')
  if (!res.ok) throw new Error('Failed to fetch store')
  return res.json()
}

export default function NewProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [hasVariants, setHasVariants] = useState(false)
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDesc: '',
    categoryId: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    sku: '',
    quantity: '0',
    lowStockThreshold: '5',
    trackQuantity: true,
    freeShipping: false,
    weight: '',
    length: '',
    width: '',
    height: '',
    status: 'DRAFT',
    isFeatured: false,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: storeData } = useQuery({
    queryKey: ['seller-store'],
    queryFn: fetchStore,
  })

  const categories = categoriesData?.categories || []
  const storeCurrency = storeData?.store?.currency || 'UGX'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
          quantity: parseInt(formData.quantity),
          lowStockThreshold: parseInt(formData.lowStockThreshold),
          weight: formData.weight ? parseFloat(formData.weight) : null,
          length: formData.length ? parseFloat(formData.length) : null,
          width: formData.width ? parseFloat(formData.width) : null,
          height: formData.height ? parseFloat(formData.height) : null,
          images,
          hasVariants,
          variantOptions: hasVariants ? variantOptions : null,
          variants: hasVariants ? variants : [],
        }),
      })

      if (response.ok) {
        router.push('/seller/products')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageAdd = (url: string) => {
    if (url && !images.includes(url)) {
      setImages([...images, url])
    }
  }

  const handleImageRemove = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Product</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create a new product listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="basic">
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
                <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
                <TabsTrigger value="variants" className="flex-1">Variants</TabsTrigger>
                <TabsTrigger value="shipping" className="flex-1">Shipping</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Product Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., iPhone 15 Pro Max 256GB"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shortDesc">Short Description</Label>
                      <Input
                        id="shortDesc"
                        placeholder="Brief product summary (max 150 characters)"
                        maxLength={150}
                        value={formData.shortDesc}
                        onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Full Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Detailed product description..."
                        rows={6}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon && <span className="mr-2">{cat.icon}</span>}
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Images */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      Product Images
                    </CardTitle>
                    <CardDescription>Add up to 10 images. First image will be the cover.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                      {images.map((img, index) => (
                        <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleImageRemove(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 mx-auto" />
                          </button>
                          {index === 0 && (
                            <Badge className="absolute bottom-1 left-1 text-xs">Cover</Badge>
                          )}
                        </div>
                      ))}
                      {images.length < 10 && (
                        <label className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Plus className="w-8 h-8 text-gray-400" />
                          <span className="text-xs text-gray-500 mt-1">Add Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                // For demo, we'll use a placeholder URL
                                // In production, you'd upload to Cloudinary/S3
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  handleImageAdd(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Supported formats: JPG, PNG, WebP. Max 5MB per image.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Selling Price ({storeCurrency}) *</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comparePrice">Compare at Price ({storeCurrency})</Label>
                        <Input
                          id="comparePrice"
                          type="number"
                          placeholder="0"
                          value={formData.comparePrice}
                          onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">Original price for showing discount</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="costPrice">Cost per Item ({storeCurrency})</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          placeholder="0"
                          value={formData.costPrice}
                          onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">For profit calculation (not shown to customers)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Inventory
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                        <Input
                          id="sku"
                          placeholder="e.g., IPHONE-15PM-256"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          placeholder="0"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
                        <Input
                          id="lowStockThreshold"
                          type="number"
                          placeholder="5"
                          value={formData.lowStockThreshold}
                          onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">Get notified when stock falls below this</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Track Quantity</Label>
                        <p className="text-sm text-gray-500">Track inventory for this product</p>
                      </div>
                      <Switch
                        checked={formData.trackQuantity}
                        onCheckedChange={(checked) => setFormData({ ...formData, trackQuantity: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="space-y-6 mt-6">
                <VariantManager
                  hasVariants={hasVariants}
                  variantOptions={variantOptions}
                  variants={variants}
                  basePrice={parseFloat(formData.price) || 0}
                  baseSku={formData.sku}
                  currency={storeCurrency}
                  onHasVariantsChange={setHasVariants}
                  onVariantOptionsChange={setVariantOptions}
                  onVariantsChange={setVariants}
                />
              </TabsContent>

              {/* Shipping Tab */}
              <TabsContent value="shipping" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Shipping
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Free Shipping</Label>
                        <p className="text-sm text-gray-500">Offer free shipping for this product</p>
                      </div>
                      <Switch
                        checked={formData.freeShipping}
                        onCheckedChange={(checked) => setFormData({ ...formData, freeShipping: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Package Dimensions (for shipping calculation)</Label>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="weight" className="text-xs text-gray-500">Weight (kg)</Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="length" className="text-xs text-gray-500">Length (cm)</Label>
                          <Input
                            id="length"
                            type="number"
                            placeholder="0"
                            value={formData.length}
                            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="width" className="text-xs text-gray-500">Width (cm)</Label>
                          <Input
                            id="width"
                            type="number"
                            placeholder="0"
                            value={formData.width}
                            onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="height" className="text-xs text-gray-500">Height (cm)</Label>
                          <Input
                            id="height"
                            type="number"
                            placeholder="0"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between">
                  <Label>Featured Product</Label>
                  <Switch
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Product
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                  {images.length > 0 ? (
                    <img src={images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="font-medium line-clamp-2">{formData.name || 'Product Name'}</p>
                <p className="text-lg font-bold text-primary mt-1">
                  {formatPrice(parseInt(formData.price || '0'), storeCurrency)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
