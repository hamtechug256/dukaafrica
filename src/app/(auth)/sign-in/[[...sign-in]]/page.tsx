import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            DuukaAfrica
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The Amazon of East Africa
          </p>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700",
              headerTitle: "text-2xl font-bold text-gray-900 dark:text-white",
              headerSubtitle: "text-gray-600 dark:text-gray-400",
              socialButtonsBlockButton: "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600",
              socialButtonsBlockButtonText: "text-gray-700 dark:text-gray-200",
              formButtonPrimary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white",
              formFieldInput: "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-orange-500 focus:ring-orange-500",
              formFieldLabel: "text-gray-700 dark:text-gray-300",
              footerActionLink: "text-orange-500 hover:text-orange-600",
            }
          }}
          signUpUrl="/sign-up"
        />
        
        {/* Trust badges */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trusted by thousands of sellers across East Africa
          </p>
          <div className="flex justify-center gap-4 mt-4">
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
