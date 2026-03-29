'use client'


import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function SellerRootPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user) {
      const hasStore = user.unsafeMetadata?.hasStore || user.unsafeMetadata?.onboardingCompleted
      
      if (hasStore) {
        router.replace('/seller/dashboard')
      } else {
        router.replace('/seller/onboarding')
      }
    }
  }, [isLoaded, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}
