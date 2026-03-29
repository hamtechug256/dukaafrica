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

  if (!userId) {
    redirect('/sign-in?redirect_url=/seller')
  }

  // Get the current pathname
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  
  // Pages that are accessible without being a seller
  const publicPages = ['/seller/onboarding', '/seller/register', '/seller/login', '/seller/learn-more', '/seller/fees', '/seller/guidelines', '/seller/resources']
  const isPublicPage = publicPages.some(page => pathname.startsWith(page))

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
  // 3. User is on a public page (onboarding, registration, etc.)
  
  if (!isSeller && !isAdmin && !isPublicPage) {
    // Redirect to onboarding if not a seller and not on a public page
    redirect('/seller/onboarding')
  }
  
  // If seller but no store, redirect to onboarding (unless already there)
  if (isSeller && needsOnboarding && !isPublicPage) {
    redirect('/seller/onboarding')
  }

  return <>{children}</>
}
