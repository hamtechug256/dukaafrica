import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  const user = await currentUser()

  // Get the current pathname
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  
  // Pages that are publicly accessible (no auth required)
  const publicPages = ['/seller/onboarding', '/seller/register', '/seller/login', '/seller/learn-more', '/seller/fees', '/seller/guidelines', '/seller/resources']
  const isPublicPage = publicPages.some(page => pathname.startsWith(page))

  // If on a public page, render it directly without auth checks
  if (isPublicPage) {
    return <>{children}</>
  }

  // For protected pages, check authentication
  if (!userId) {
    redirect('/sign-in?redirect_url=' + encodeURIComponent(pathname))
  }

  // Check if user is a seller or admin
  const role = user?.unsafeMetadata?.role as string | undefined
  const hasStore = user?.unsafeMetadata?.hasStore as boolean | undefined
  const onboardingCompleted = user?.unsafeMetadata?.onboardingCompleted as boolean | undefined
  
  const isSeller = role === 'SELLER'
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const needsOnboarding = !hasStore && !onboardingCompleted

  // Allow access if:
  // 1. User is already a seller with a store
  // 2. User is an admin
  if (isSeller || isAdmin) {
    // If seller but needs onboarding, redirect to onboarding (unless already there)
    if (needsOnboarding && !pathname.startsWith('/seller/onboarding')) {
      redirect('/seller/onboarding')
    }
    return <>{children}</>
  }

  // Not a seller/admin and not on a public page - redirect to onboarding
  redirect('/seller/onboarding')
}
