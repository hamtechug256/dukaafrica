'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, ChevronDown, ChevronUp, Package } from 'lucide-react'

interface VariantOption {
  name: string
  values: string[]
}

interface Variant {
  id: string
  name: string
  sku: string
  price: number
  comparePrice?: number
  quantity: number
  image?: string
  options: Record<string, string>
  isActive: boolean
}

interface ProductVariantBuilderProps {
  variants: Variant[]
  variantOptions: VariantOption[]
  onChange: (variants: Variant[], variantOptions: VariantOption[]) => void
  basePrice: number
}

const colors = [
  'Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Purple', 'Orange', 
  'Pink', 'Brown', 'Gray', 'Navy', 'Teal', 'Maroon', 'Beige', 'Gold', 'Silver'
]

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL']

const materials = ['Cotton', 'Polyester', 'Silk', 'Wool', 'Leather', 'Denim', 'Linen', 'Velvet']

export function ProductVariantBuilder({ 
  variants, 
  variantOptions, 
  onChange, 
  basePrice 
}: ProductVariantBuilderProps) {
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null)

  const addVariantOption = () => {
    const newOption: VariantOption = {
      name: '',
      values: [],
    }
    onChange(variants, [...variantOptions, newOption])
  }

  const updateVariantOption = (index: number, field: 'name' | 'values', value: string | string[]) => {
    const updated = [...variantOptions]
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string }
    } else {
      updated[index] = { ...updated[index], values: value as string[] }
    }
    onChange(variants, updated)
  }

  const removeVariantOption = (index: number) => {
    const updated = variantOptions.filter((_, i) => i !== index)
    onChange(variants, updated)
  }

  const generateVariants = () => {
    if (variantOptions.length === 0 || variantOptions.some(opt => !opt.name || opt.values.length === 0)) {
      return
    }

    // Generate all combinations
    const combinations = variantOptions.reduce<string[][]>(
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

    // Create variants from combinations
    const newVariants: Variant[] = combinations.map((combo, index) => {
      const options: Record<string, string> = {}
      variantOptions.forEach((opt, i) => {
        options[opt.name] = combo[i]
      })

      return {
        id: `variant-${Date.now()}-${index}`,
        name: combo.join(' / '),
        sku: '',
        price: basePrice,
        quantity: 0,
        options,
        isActive: true,
      }
    })

    onChange(newVariants, variantOptions)
  }

  const updateVariant = (id: string, field: keyof Variant, value: string | number | boolean) => {
    const updated = variants.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    )
    onChange(updated, variantOptions)
  }

  const removeVariant = (id: string) => {
    onChange(variants.filter(v => v.id !== id), variantOptions)
  }

  const getSuggestions = (optionName: string) => {
    const name = optionName.toLowerCase()
    if (name.includes('color') || name.includes('colour')) return colors
    if (name.includes('size')) return sizes
    if (name.includes('material')) return materials
    return []
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Product Variants
        </CardTitle>
        <CardDescription>
          Add variants like color, size, or material. Each variant can have its own price and inventory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variant Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Variant Options</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={addVariantOption}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Option
            </Button>
          </div>

          {variantOptions.map((option, optionIndex) => (
            <div key={optionIndex} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Option Name</Label>
                  <Input
                    placeholder="e.g., Color, Size, Material"
                    value={option.name}
                    onChange={(e) => updateVariantOption(optionIndex, 'name', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariantOption(optionIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Values</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {option.values.map((value, valueIndex) => (
                    <Badge 
                      key={valueIndex} 
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = option.values.filter((_, i) => i !== valueIndex)
                          updateVariantOption(optionIndex, 'values', newValues)
                        }}
                        className="ml-2 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add value..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        const value = input.value.trim()
                        if (value && !option.values.includes(value)) {
                          updateVariantOption(optionIndex, 'values', [...option.values, value])
                          input.value = ''
                        }
                      }
                    }}
                  />
                  {option.name && getSuggestions(option.name).length > 0 && (
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!option.values.includes(value)) {
                          updateVariantOption(optionIndex, 'values', [...option.values, value])
                        }
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Suggestions" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSuggestions(option.name)
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
            </div>
          ))}
        </div>

        {/* Generate Variants Button */}
        {variantOptions.length > 0 && (
          <Button 
            type="button" 
            onClick={generateVariants}
            disabled={variantOptions.some(opt => !opt.name || opt.values.length === 0)}
          >
            Generate Variants
          </Button>
        )}

        {/* Generated Variants */}
        {variants.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Generated Variants ({variants.length})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange([], variantOptions)}
                className="text-red-500"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {variants.map((variant) => (
                <div 
                  key={variant.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                    onClick={() => setExpandedVariant(expandedVariant === variant.id ? null : variant.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={variant.isActive ? "default" : "secondary"}>
                        {variant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-sm text-gray-500">
                        UGX {variant.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        Stock: {variant.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeVariant(variant.id)
                        }}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {expandedVariant === variant.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {expandedVariant === variant.id && (
                    <div className="p-4 border-t space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">SKU</Label>
                          <Input
                            value={variant.sku}
                            onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                            placeholder="Optional SKU"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Price (UGX)</Label>
                          <Input
                            type="number"
                            value={variant.price}
                            onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Compare at Price</Label>
                          <Input
                            type="number"
                            value={variant.comparePrice || ''}
                            onChange={(e) => updateVariant(variant.id, 'comparePrice', parseFloat(e.target.value) || undefined)}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Quantity</Label>
                          <Input
                            type="number"
                            value={variant.quantity}
                            onChange={(e) => updateVariant(variant.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Active</Label>
                        <input
                          type="checkbox"
                          checked={variant.isActive}
                          onChange={(e) => updateVariant(variant.id, 'isActive', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
