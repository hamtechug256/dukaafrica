'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Star,
  Loader2,
  Check,
  Home,
  Briefcase,
  Building
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

async function fetchAddresses() {
  const res = await fetch('/api/user/addresses')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function createAddress(data: any) {
  const res = await fetch('/api/user/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create')
  return res.json()
}

async function deleteAddress(id: string) {
  const res = await fetch(`/api/user/addresses?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
  return res.json()
}

const countryOptions = [
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
]

const labelIcons: Record<string, any> = {
  Home,
  Work: Briefcase,
  Office: Building,
}

export default function AddressesPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setIsOpen(false)
      resetForm()
      toast.success('Address saved successfully')
    },
    onError: () => toast.error('Failed to save address'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('Address deleted')
    },
    onError: () => toast.error('Failed to delete address'),
  })

  const [formData, setFormData] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    country: 'UG',
    region: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    isDefault: false,
  })

  const resetForm = () => {
    setFormData({
      label: 'Home',
      fullName: '',
      phone: '',
      country: 'UG',
      region: '',
      city: '',
      addressLine1: '',
      addressLine2: '',
      postalCode: '',
      isDefault: false,
    })
    setEditingAddress(null)
  }

  const handleSubmit = () => {
    createMutation.mutate(formData)
  }

  const addresses = data?.addresses || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                My Addresses
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your delivery addresses
              </p>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Address
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAddress ? 'Edit Address' : 'Add New Address'}
                  </DialogTitle>
                  <DialogDescription>
                    Enter the delivery address details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Label Selection */}
                  <div className="space-y-2">
                    <Label>Address Label</Label>
                    <div className="flex gap-2">
                      {['Home', 'Work', 'Office'].map((label) => {
                        const Icon = labelIcons[label]
                        return (
                          <Button
                            key={label}
                            type="button"
                            variant={formData.label === label ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFormData({ ...formData, label })}
                          >
                            <Icon className="w-4 h-4 mr-1" />
                            {label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+256 7XX XXX XXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <select
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border bg-white dark:bg-gray-800"
                      >
                        {countryOptions.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Kampala"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">Region/State</Label>
                    <Input
                      id="region"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      placeholder="Central Region"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="isDefault" className="cursor-pointer">
                      Set as default address
                    </Label>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || !formData.fullName || !formData.addressLine1 || !formData.city}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Address'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          </div>
        ) : addresses.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No addresses saved</h2>
              <p className="text-gray-500 mb-4">
                Add a delivery address for faster checkout
              </p>
              <Button onClick={() => setIsOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {addresses.map((address: any) => {
              const Icon = labelIcons[address.label] || MapPin
              return (
                <Card key={address.id} className={address.isDefault ? 'border-primary' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{address.label}</p>
                          {address.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingAddress(address)
                            setFormData({
                              label: address.label,
                              fullName: address.fullName,
                              phone: address.phone,
                              country: address.country,
                              region: address.region || '',
                              city: address.city,
                              addressLine1: address.addressLine1,
                              addressLine2: address.addressLine2 || '',
                              postalCode: address.postalCode || '',
                              isDefault: address.isDefault,
                            })
                            setIsOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => deleteMutation.mutate(address.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-medium text-gray-900 dark:text-white">{address.fullName}</p>
                      <p>{address.addressLine1}</p>
                      {address.addressLine2 && <p>{address.addressLine2}</p>}
                      <p>{address.city}, {address.region}</p>
                      <p>{countryOptions.find(c => c.code === address.country)?.name || address.country}</p>
                      <p className="font-medium mt-2">{address.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
