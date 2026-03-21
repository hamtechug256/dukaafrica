import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            DuukaAfrica
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Join East Africa's Largest Marketplace
          </p>
        </div>
        
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700",
              headerTitle: "text-2xl font-bold text-gray-900 dark:text-white",
              headerSubtitle: "text-gray-600 dark:text-gray-400",
              socialButtonsBlockButton: "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600",
              socialButtonsBlockButtonText: "text-gray-700 dark:text-gray-200",
              formButtonPrimary: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white",
              formFieldInput: "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500",
              formFieldLabel: "text-gray-700 dark:text-gray-300",
              footerActionLink: "text-green-500 hover:text-green-600",
            }
          }}
          signInUrl="/sign-in"
        />
        
        {/* Benefits */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-green-500">✓</span>
            <span>Free to join - No listing fees for basic sellers</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-green-500">✓</span>
            <span>Reach millions of buyers across 6 countries</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-green-500">✓</span>
            <span>Secure payments with Mobile Money & Cards</span>
          </div>
        </div>
        
        {/* Country flags */}
        <div className="mt-6 text-center">
          <div className="flex justify-center gap-4">
            <span className="text-2xl">🇺🇬</span>
            <span className="text-2xl">🇰🇪</span>
            <span className="text-2xl">🇹🇿</span>
            <span className="text-2xl">🇷🇼</span>
            <span className="text-2xl">🇸🇸</span>
            <span className="text-2xl">🇧🇮</span>
          </div>
        </div>
      </div>
    </div>
  )
}
