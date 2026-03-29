'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Heart, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WishlistButtonProps {
  productId: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showText?: boolean
}

async function fetchWishlist() {
  const res = await fetch('/api/wishlist')
  if (!res.ok) throw new Error('Failed to fetch wishlist')
  return res.json()
}

async function addToWishlist(productId: string) {
  const res = await fetch('/api/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to add to wishlist')
  }
  return res.json()
}

async function removeFromWishlist(productId: string) {
  const res = await fetch(`/api/wishlist?productId=${productId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to remove from wishlist')
  return res.json()
}

export function WishlistButton({
  productId,
  variant = 'ghost',
  size = 'icon',
  className,
  showText = false,
}: WishlistButtonProps) {
  const { isSignedIn } = useUser()
  const [isInWishlist, setIsInWishlist] = useState(false)
  const queryClient = useQueryClient()

  // Fetch wishlist to check if product is in it
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: fetchWishlist,
    enabled: isSignedIn,
  })

  // Update isInWishlist when wishlist data changes
  useEffect(() => {
    if (wishlistData?.wishlist) {
      const inWishlist = wishlistData.wishlist.some(
        (item: { productId: string }) => item.productId === productId
      )
      setIsInWishlist(inWishlist)
    }
  }, [wishlistData, productId])

  const addMutation = useMutation({
    mutationFn: addToWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      setIsInWishlist(true)
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      setIsInWishlist(false)
    },
  })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isSignedIn) {
      return
    }

    if (isInWishlist) {
      removeMutation.mutate(productId)
    } else {
      addMutation.mutate(productId)
    }
  }

  const isLoading = addMutation.isPending || removeMutation.isPending

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button
          variant={variant}
          size={size}
          className={cn(
            'transition-all',
            className
          )}
        >
          <Heart className={cn('w-5 h-5', showText && 'mr-2')} />
          {showText && 'Save'}
        </Button>
      </SignInButton>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'transition-all',
        isInWishlist && 'text-red-500 hover:text-red-600',
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className={cn('w-5 h-5 animate-spin', showText && 'mr-2')} />
      ) : (
        <Heart
          className={cn('w-5 h-5', showText && 'mr-2', isInWishlist && 'fill-current')}
        />
      )}
      {showText && (isInWishlist ? 'Saved' : 'Save')}
    </Button>
  )
}
