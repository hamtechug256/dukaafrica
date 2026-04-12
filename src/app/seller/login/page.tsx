'use client'


import { useEffect } from 'react'
import { useUser, useClerk, SignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Store, ArrowRight, CheckCircle, Truck, DollarSign, Headphones } from 'lucide-react'

export default function SellerLoginPage() {
  const { isSignedIn, user } = useUser()
  const { redirectToSignIn } = useClerk()
  const router = useRouter()

  useEffect(() => {
    // If already signed in, redirect to seller dashboard
    if (isSignedIn) {
      router.push('/seller/dashboard')
    }
  }, [isSignedIn, router])

  // If signed in, show loading while redirecting
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Info */}
          <div className="hidden lg:block">
            <div className="mb-8">
              <Link href="/" className="flex items-center mb-6">
                <img src="/brand/logo-horizontal.png" alt="DuukaAfrica" className="h-10 w-auto object-contain" />
              </Link>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome Back, Seller!
              </h1>
              <p className="text-lg text-gray-600">
                Sign in to access your seller dashboard and manage your store.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Your Store</h3>
                  <p className="text-sm text-gray-500">Update products, track inventory, and manage orders all in one place.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Track Your Earnings</h3>
                  <p className="text-sm text-gray-500">Monitor sales, view payouts, and analyze your business performance.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Headphones className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Customer Support</h3>
                  <p className="text-sm text-gray-500">Communicate with buyers and resolve issues quickly.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-primary to-emerald-600 rounded-xl text-white">
              <h3 className="font-semibold text-lg mb-2">New to DuukaAfrica?</h3>
              <p className="text-white/80 text-sm mb-4">
                Join thousands of successful sellers across East Africa.
              </p>
              <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <Link href="/seller/register">
                  Start Selling Today <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Side - Sign In Form */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="lg:hidden flex items-center justify-center mb-4">
                  <img src="/brand/logo-horizontal.png" alt="DuukaAfrica" className="h-10 w-auto object-contain" />
                </div>
                <CardTitle className="text-2xl">Seller Sign In</CardTitle>
                <CardDescription>
                  Sign in to access your seller dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignIn 
                  routing="path"
                  path="/seller/login"
                  signUpUrl="/seller/register"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none p-0",
                      header: "hidden",
                      socialButtonsBlockButton: "w-full",
                      formButtonPrimary: "w-full bg-primary hover:bg-primary/90"
                    }
                  }}
                />
                
                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>
                    Don't have a seller account?{' '}
                    <Link href="/seller/register" className="text-primary font-medium hover:underline">
                      Register here
                    </Link>
                  </p>
                </div>

                <div className="mt-4 text-center">
                  <Link href="/sign-in" className="text-sm text-gray-500 hover:text-primary">
                    Sign in as a buyer instead
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
