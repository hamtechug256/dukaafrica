'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Zap, Calendar, Package, AlertCircle, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/currency'

interface Product {
  id: string
  name: string
  price: number
  quantity: number
  images: string[]
  flashSaleDiscount?: number | null
  flashSaleStock?: number | null
  flashSaleStart?: Date | string | null
  flashSaleEnd?: Date | string | null
  flashSaleClaimed?: number
}

interface FlashSaleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  products: Product[]
  mode: 'create' | 'edit'
  onSubmit: (data: FlashSaleFormData) => Promise<void>
  isLoading?: boolean
  currency?: string
}

export interface FlashSaleFormData {
  productId: string
  discount: number
  flashSaleStock: number
  flashSaleStart: string
  flashSaleEnd: string
}

// Helper to get default date values
function getDefaultDates() {
  const now = new Date()
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
  const defaultEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000) // 25 hours from now

  return {
    startDate: defaultStart.toISOString().split('T')[0],
    startTime: defaultStart.toTimeString().slice(0, 5),
    endDate: defaultEnd.toISOString().split('T')[0],
    endTime: defaultEnd.toTimeString().slice(0, 5),
  }
}

// Helper to parse existing dates
function parseExistingDates(start: Date | string | null | undefined, end: Date | string | null | undefined) {
  if (!start || !end) {
    return getDefaultDates()
  }

  const startDate = new Date(start)
  const endDate = new Date(end)

  return {
    startDate: startDate.toISOString().split('T')[0],
    startTime: startDate.toTimeString().slice(0, 5),
    endDate: endDate.toISOString().split('T')[0],
    endTime: endDate.toTimeString().slice(0, 5),
  }
}

export function FlashSaleFormDialog({
  open,
  onOpenChange,
  product,
  products,
  mode,
  onSubmit,
  isLoading = false,
  currency = 'UGX',
}: FlashSaleFormDialogProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [discount, setDiscount] = useState(20)
  const [flashSaleStock, setFlashSaleStock] = useState(10)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize dates once when component mounts
  const defaults = getDefaultDates()
  
  // Use memoized initialization
  const initializeForm = useCallback(() => {
    if (mode === 'edit' && product) {
      setSelectedProductId(product.id)
      setDiscount(product.flashSaleDiscount || 20)
      setFlashSaleStock(product.flashSaleStock || 10)
      const parsed = parseExistingDates(product.flashSaleStart, product.flashSaleEnd)
      setStartDate(parsed.startDate)
      setStartTime(parsed.startTime)
      setEndDate(parsed.endDate)
      setEndTime(parsed.endTime)
    } else {
      setSelectedProductId('')
      setDiscount(20)
      setFlashSaleStock(10)
      setStartDate(defaults.startDate)
      setStartTime(defaults.startTime)
      setEndDate(defaults.endDate)
      setEndTime(defaults.endTime)
    }
    setErrors({})
  }, [mode, product, defaults])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Use setTimeout to defer state updates
      const timer = setTimeout(() => {
        initializeForm()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [open, initializeForm])

  // Get selected product details
  const selectedProduct = products.find((p) => p.id === selectedProductId) || product

  // Calculate flash sale price
  const flashSalePrice = selectedProduct
    ? Math.round(selectedProduct.price * (1 - discount / 100))
    : 0

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedProductId) {
      newErrors.productId = 'Please select a product'
    }

    if (discount < 1 || discount > 99) {
      newErrors.discount = 'Discount must be between 1 and 99 percent'
    }

    if (flashSaleStock < 1) {
      newErrors.flashSaleStock = 'Stock must be at least 1'
    }

    if (selectedProduct && flashSaleStock > selectedProduct.quantity) {
      newErrors.flashSaleStock = `Stock cannot exceed available quantity (${selectedProduct.quantity})`
    }

    if (mode === 'edit' && selectedProduct?.flashSaleClaimed && flashSaleStock < selectedProduct.flashSaleClaimed) {
      newErrors.flashSaleStock = `Stock cannot be less than already claimed (${selectedProduct.flashSaleClaimed})`
    }

    if (!startDate || !startTime) {
      newErrors.start = 'Start date and time are required'
    }

    if (!endDate || !endTime) {
      newErrors.end = 'End date and time are required'
    }

    const start = new Date(`${startDate}T${startTime}`)
    const end = new Date(`${endDate}T${endTime}`)

    if (start >= end) {
      newErrors.end = 'End time must be after start time'
    }

    if (mode === 'create' && start <= new Date()) {
      newErrors.start = 'Start time must be in the future'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    await onSubmit({
      productId: selectedProductId,
      discount,
      flashSaleStock,
      flashSaleStart: `${startDate}T${startTime}`,
      flashSaleEnd: `${endDate}T${endTime}`,
    })
  }

  // Format date for display
  const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return ''
    const date = new Date(`${dateStr}T${timeStr}`)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            {mode === 'create' ? 'Create Flash Sale' : 'Edit Flash Sale'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Set up a limited-time discount for your product'
              : 'Update your flash sale settings'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Selection (only for create mode) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label>Select Product *</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product for flash sale" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.quantity > 0) // Only show products with stock
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <span>{p.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Stock: {p.quantity}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.productId}
                </p>
              )}
            </div>
          )}

          {/* Selected Product Preview */}
          {selectedProduct && (
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    {selectedProduct.images?.[0] ? (
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedProduct.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">Stock: {selectedProduct.quantity}</Badge>
                      <span className="text-sm text-gray-500">
                        {formatPrice(selectedProduct.price, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discount Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Discount Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-20 text-center"
                  min={1}
                  max={99}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <Slider
              value={[discount]}
              onValueChange={(value) => setDiscount(value[0])}
              min={1}
              max={99}
              step={1}
              className="py-2"
            />
            {errors.discount && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.discount}
              </p>
            )}
          </div>

          {/* Flash Sale Stock */}
          <div className="space-y-2">
            <Label htmlFor="stock">Flash Sale Stock *</Label>
            <Input
              id="stock"
              type="number"
              value={flashSaleStock}
              onChange={(e) => setFlashSaleStock(Number(e.target.value))}
              min={1}
              max={selectedProduct?.quantity || 999}
            />
            {selectedProduct && (
              <p className="text-xs text-gray-500">
                Maximum: {selectedProduct.quantity} available
                {mode === 'edit' && selectedProduct.flashSaleClaimed && (
                  <span> | Claimed: {selectedProduct.flashSaleClaimed}</span>
                )}
              </p>
            )}
            {errors.flashSaleStock && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.flashSaleStock}
              </p>
            )}
          </div>

          {/* Date/Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {errors.start && (
                <p className="text-sm text-red-500">{errors.start}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                End Date
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              {errors.end && (
                <p className="text-sm text-red-500">{errors.end}</p>
              )}
            </div>
          </div>

          {/* Price Preview */}
          {selectedProduct && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Price Preview
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500 line-through">
                    {formatPrice(selectedProduct.price, currency)}
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {formatPrice(flashSalePrice, currency)}
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-lg px-3 py-1">
                    -{discount}%
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Customers save {formatPrice(selectedProduct.price - flashSalePrice, currency)}
              </div>
            </div>
          )}

          {/* Schedule Preview */}
          {startDate && startTime && endDate && endTime && (
            <div className="text-sm text-gray-600 dark:text-gray-400 border-t pt-4">
              <p className="font-medium mb-1">Schedule:</p>
              <p>{formatDateTime(startDate, startTime)} → {formatDateTime(endDate, endTime)}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedProductId}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Create Flash Sale' : 'Update Flash Sale'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
