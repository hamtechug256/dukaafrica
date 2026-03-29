'use client'


import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function SellerRootPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { redirectToSignIn } = useClerk()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return // Still loading, wait

    if (!isSignedIn) {
      // Not signed in - redirect to sign in page
      redirectToSignIn({ redirectUrl: '/seller' })
      return
    }

    // User is signed in, check their status
    const hasStore = user.unsafeMetadata?.hasStore || user.unsafeMetadata?.onboardingCompleted
    
    if (hasStore) {
      router.replace('/seller/dashboard')
    } else {
      router.replace('/seller/onboarding')
    }
  }, [isLoaded, isSignedIn, user, router, redirectToSignIn])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
