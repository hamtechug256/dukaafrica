import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Seller Center - DuukaAfrica | Start Selling Today',
  description: 'Join DuukaAfrica as a seller. Set up your store, list products, manage orders, and reach millions of buyers across East Africa with secure escrow payments.',
}

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

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

  // SECURITY FIX: Use database-backed role check instead of Clerk's unsafeMetadata
  // unsafeMetadata is not cryptographically signed and can diverge from the database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      role: true,
      Store: {
        select: {
          id: true,
          verificationStatus: true,
        },
      },
    },
  })

  const role = dbUser?.role
  const hasStore = !!dbUser?.Store
  const storeVerified = hasStore && dbUser!.Store!.verificationStatus === 'VERIFIED'
  
  const isSeller = role === 'SELLER'
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const needsOnboarding = isSeller && !storeVerified

  // Allow access if:
  // 1. User is already a seller with an active store
  // 2. User is an admin
  if ((isSeller && storeVerified) || isAdmin) {
    return <>{children}</>
  }

  // If seller but needs onboarding, redirect (unless already there)
  if (isSeller && needsOnboarding && !pathname.startsWith('/seller/onboarding')) {
    redirect('/seller/onboarding')
  }

  // Not a seller/admin and not on a public page - redirect to onboarding
  redirect('/seller/onboarding')
}
