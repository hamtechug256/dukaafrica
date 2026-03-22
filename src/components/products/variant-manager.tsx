'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  X,
  Package,
  Layers,
  Settings2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Check,
} from 'lucide-react'

// Types
export interface VariantOption {
  name: string
  values: string[]
}

export interface ProductVariant {
  id: string
  name: string
  sku: string
  price: number
  comparePrice?: number | null
  quantity: number
  image?: string | null
  options: Record<string, string>
  isActive: boolean
}

interface VariantManagerProps {
  hasVariants: boolean
  variantOptions: VariantOption[]
  variants: ProductVariant[]
  basePrice: number
  baseSku: string
  onHasVariantsChange: (hasVariants: boolean) => void
  onVariantOptionsChange: (options: VariantOption[]) => void
  onVariantsChange: (variants: ProductVariant[]) => void
}

// Preset options for quick selection
const PRESET_COLORS = [
  'Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Purple', 'Orange',
  'Pink', 'Brown', 'Gray', 'Navy', 'Teal', 'Maroon', 'Beige', 'Gold', 'Silver'
]

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL']

const PRESET_MATERIALS = ['Cotton', 'Polyester', 'Silk', 'Wool', 'Leather', 'Denim', 'Linen', 'Velvet']

export function VariantManager({
  hasVariants,
  variantOptions,
  variants,
  basePrice,
  baseSku,
  onHasVariantsChange,
  onVariantOptionsChange,
  onVariantsChange,
}: VariantManagerProps) {
  // State for new option name input
  const [newOptionName, setNewOptionName] = useState('')
  // State for bulk edit
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkQuantity, setBulkQuantity] = useState('')
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null)

  // Get preset suggestions based on option name
  const getPresetSuggestions = useCallback((optionName: string): string[] => {
    const name = optionName.toLowerCase()
    if (name.includes('color') || name.includes('colour')) return PRESET_COLORS
    if (name.includes('size')) return PRESET_SIZES
    if (name.includes('material')) return PRESET_MATERIALS
    return []
  }, [])

  // Generate unique ID for variants
  const generateVariantId = useCallback(() => {
    return `variant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Generate all combinations from variant options
  const generateCombinations = useCallback((options: VariantOption[]): string[][] => {
    if (options.length === 0) return []
    
    return options.reduce<string[][]>(
      (acc, option) => {
        if (acc.length === 0) {
          return option.values.map(v => [v])
        }
        return acc.flatMap(combo =>
          option.values.map(v => [...combo, v])
        )
      },
      []
    )
  }, [])

  // Generate variants from options
  const generateVariants = useCallback(() => {
    // Validation
    if (variantOptions.length === 0) {
      setValidationError('Add at least one variant option')
      return
    }

    const invalidOptions = variantOptions.filter(opt => !opt.name.trim() || opt.values.length === 0)
    if (invalidOptions.length > 0) {
      setValidationError('All options must have a name and at least one value')
      return
    }

    setValidationError(null)

    const combinations = generateCombinations(variantOptions)
    
    // Preserve existing variant data if possible
    const newVariants: ProductVariant[] = combinations.map((combo, index) => {
      const options: Record<string, string> = {}
      variantOptions.forEach((opt, i) => {
        options[opt.name] = combo[i]
      })

      const variantName = combo.join(' / ')
      
      // Try to find matching existing variant to preserve data
      const existingVariant = variants.find(v => v.name === variantName)

      return {
        id: existingVariant?.id || generateVariantId(),
        name: variantName,
        sku: existingVariant?.sku || (baseSku ? `${baseSku}-${index + 1}` : ''),
        price: existingVariant?.price || basePrice,
        comparePrice: existingVariant?.comparePrice || null,
        quantity: existingVariant?.quantity || 0,
        image: existingVariant?.image || null,
        options,
        isActive: existingVariant?.isActive ?? true,
      }
    })

    onVariantsChange(newVariants)
  }, [variantOptions, variants, basePrice, baseSku, generateCombinations, generateVariantId, onVariantsChange])

  // Add new variant option
  const addVariantOption = useCallback(() => {
    if (!newOptionName.trim()) return
    
    const name = newOptionName.trim()
    if (variantOptions.some(opt => opt.name.toLowerCase() === name.toLowerCase())) {
      setValidationError('An option with this name already exists')
      return
    }

    setValidationError(null)
    onVariantOptionsChange([...variantOptions, { name, values: [] }])
    setNewOptionName('')
  }, [newOptionName, variantOptions, onVariantOptionsChange])

  // Remove variant option
  const removeVariantOption = useCallback((index: number) => {
    const updated = variantOptions.filter((_, i) => i !== index)
    onVariantOptionsChange(updated)
    // Clear variants when options change
    onVariantsChange([])
  }, [variantOptions, onVariantOptionsChange, onVariantsChange])

  // Add value to option
  const addValueToOption = useCallback((optionIndex: number, value: string) => {
    if (!value.trim()) return
    
    const option = variantOptions[optionIndex]
    if (option.values.some(v => v.toLowerCase() === value.toLowerCase())) {
      return // Value already exists
    }

    const updated = [...variantOptions]
    updated[optionIndex] = {
      ...option,
      values: [...option.values, value.trim()],
    }
    onVariantOptionsChange(updated)
    // Clear variants when options change
    onVariantsChange([])
  }, [variantOptions, onVariantOptionsChange, onVariantsChange])

  // Remove value from option
  const removeValueFromOption = useCallback((optionIndex: number, valueIndex: number) => {
    const option = variantOptions[optionIndex]
    const updated = [...variantOptions]
    updated[optionIndex] = {
      ...option,
      values: option.values.filter((_, i) => i !== valueIndex),
    }
    onVariantOptionsChange(updated)
    // Clear variants when options change
    onVariantsChange([])
  }, [variantOptions, onVariantOptionsChange, onVariantsChange])

  // Update variant field
  const updateVariant = useCallback((variantId: string, field: keyof ProductVariant, value: string | number | boolean | null) => {
    const updated = variants.map(v =>
      v.id === variantId ? { ...v, [field]: value } : v
    )
    onVariantsChange(updated)
  }, [variants, onVariantsChange])

  // Delete variant
  const deleteVariant = useCallback((variantId: string) => {
    onVariantsChange(variants.filter(v => v.id !== variantId))
  }, [variants, onVariantsChange])

  // Bulk update variants
  const bulkUpdateVariants = useCallback(() => {
    if (!bulkPrice && !bulkQuantity) return

    const updated = variants.map(v => ({
      ...v,
      ...(bulkPrice ? { price: parseFloat(bulkPrice) } : {}),
      ...(bulkQuantity ? { quantity: parseInt(bulkQuantity) } : {}),
    }))

    onVariantsChange(updated)
    setBulkPrice('')
    setBulkQuantity('')
  }, [variants, bulkPrice, bulkQuantity, onVariantsChange])

  // Clear all variants
  const clearAllVariants = useCallback(() => {
    onVariantsChange([])
    onVariantOptionsChange([])
    setValidationError(null)
  }, [onVariantsChange, onVariantOptionsChange])

  // Handle hasVariants toggle
  const handleHasVariantsToggle = (checked: boolean) => {
    onHasVariantsChange(checked)
    if (!checked) {
      clearAllVariants()
    }
  }

  // Calculate total stock
  const totalStock = variants.reduce((sum, v) => sum + v.quantity, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Product Variants
        </CardTitle>
        <CardDescription>
          Add variants like color, size, or material. Each variant can have its own price and inventory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Variants Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">This product has variants</Label>
            <p className="text-sm text-gray-500">
              Enable if your product comes in multiple options like sizes or colors
            </p>
          </div>
          <Switch
            checked={hasVariants}
            onCheckedChange={handleHasVariantsToggle}
          />
        </div>

        {hasVariants && (
          <>
            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{validationError}</span>
              </div>
            )}

            {/* Variant Options Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Variant Options</Label>
              </div>

              {/* Add new option input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Option name (e.g., Color, Size, Material)"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addVariantOption()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addVariantOption}
                  disabled={!newOptionName.trim()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              </div>

              {/* Existing options */}
              {variantOptions.length > 0 && (
                <div className="space-y-4">
                  {variantOptions.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{option.name}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariantOption(optionIndex)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>

                      {/* Values as tags */}
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value, valueIndex) => (
                          <Badge
                            key={valueIndex}
                            variant="secondary"
                            className="px-3 py-1.5 text-sm"
                          >
                            {value}
                            <button
                              type="button"
                              onClick={() => removeValueFromOption(optionIndex, valueIndex)}
                              className="ml-2 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>

                      {/* Add value input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Add ${option.name.toLowerCase()} value...`}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const input = e.target as HTMLInputElement
                              addValueToOption(optionIndex, input.value)
                              input.value = ''
                            }
                          }}
                        />
                        {/* Preset suggestions */}
                        {getPresetSuggestions(option.name).length > 0 && (
                          <Select
                            value=""
                            onValueChange={(value) => {
                              if (value && !option.values.includes(value)) {
                                addValueToOption(optionIndex, value)
                              }
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Quick add..." />
                            </SelectTrigger>
                            <SelectContent>
                              {getPresetSuggestions(option.name)
                                .filter(s => !option.values.includes(s))
                                .map(suggestion => (
                                  <SelectItem key={suggestion} value={suggestion}>
                                    {suggestion}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Generate Variants Button */}
              {variantOptions.length > 0 && variantOptions.every(opt => opt.values.length > 0) && (
                <Button
                  type="button"
                  onClick={generateVariants}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {variants.length > 0 ? 'Regenerate Variants' : 'Generate Variants'}
                </Button>
              )}
            </div>

            <Separator />

            {/* Variant Combinations Table */}
            {variants.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      Variant Combinations ({variants.length})
                    </Label>
                    <p className="text-sm text-gray-500">
                      Total stock: {totalStock} units
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all variants?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all variant options and combinations. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearAllVariants}>
                          Clear All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Bulk Edit */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Settings2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Bulk edit:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Price (UGX)"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="w-32"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(e.target.value)}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={bulkUpdateVariants}
                      disabled={!bulkPrice && !bulkQuantity}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Apply to All
                    </Button>
                  </div>
                </div>

                {/* Variants Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white dark:bg-gray-900">
                        <TableRow>
                          <TableHead className="min-w-32">Variant</TableHead>
                          <TableHead className="w-28">SKU</TableHead>
                          <TableHead className="w-28">Price (UGX)</TableHead>
                          <TableHead className="w-32">Compare Price</TableHead>
                          <TableHead className="w-20">Quantity</TableHead>
                          <TableHead className="w-16">Status</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variants.map((variant) => (
                          <TableRow key={variant.id}>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(variant.options).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="text-xs">
                                    {value}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={variant.sku}
                                onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                placeholder="SKU"
                                className="w-24 h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={variant.price}
                                onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-24 h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={variant.comparePrice || ''}
                                onChange={(e) => updateVariant(variant.id, 'comparePrice', e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="Optional"
                                className="w-24 h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={variant.quantity}
                                onChange={(e) => updateVariant(variant.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-16 h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={variant.isActive ? 'default' : 'secondary'}
                                className="cursor-pointer"
                                onClick={() => updateVariant(variant.id, 'isActive', !variant.isActive)}
                              >
                                {variant.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteVariant(variant.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {variantOptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Add variant options to get started</p>
                <p className="text-xs mt-1">e.g., Color, Size, Material</p>
              </div>
            )}

            {variantOptions.length > 0 && variants.length === 0 && !variantOptions.every(opt => opt.values.length > 0) && (
              <div className="text-center py-8 text-gray-500">
                <Edit3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Add values to your options</p>
                <p className="text-xs mt-1">Each option needs at least one value to generate variants</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
