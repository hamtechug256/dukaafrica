'use client'

import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cart-store'

export function CartHeader() {
  const { getItemCount, openCart } = useCartStore()
  const itemCount = getItemCount()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={openCart}
    >
      <ShoppingCart className="w-5 h-5" />
      {itemCount > 0 && (
        <Badge
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </Badge>
      )}
    </Button>
  )
}
