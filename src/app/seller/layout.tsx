import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect('/sign-in')
  }

  // Check if user is a seller or trying to become one
  const role = user?.unsafeMetadata?.role

  // Allow access if:
  // 1. User is already a seller
  // 2. User is on the onboarding page (to become a seller)
  // Otherwise redirect to onboarding

  return <>{children}</>
}
