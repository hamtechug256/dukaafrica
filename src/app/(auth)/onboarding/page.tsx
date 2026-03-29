// Force dynamic rendering to avoid Clerk prerender issues
export const dynamic = 'force-dynamic'

import { OnboardingContent } from './onboarding-content'

export default function OnboardingPage() {
  return <OnboardingContent />
}
