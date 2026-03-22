'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Store } from 'lucide-react'

export default function SellerRegisterPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Become a Seller</h1>
          <p className="text-gray-600 mt-2">Join DuukaAfrica and start selling today</p>
        </div>

        {/* Sign Up Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Sign up to start your seller journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUp
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "bg-transparent border-0 shadow-none",
                  header: "hidden",
                  footer: "hidden",
                  formButtonPrimary: "bg-primary hover:bg-primary/90 w-full",
                },
              }}
              signInUrl="/sign-in"
              fallbackRedirectUrl="/seller/onboarding"
            />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <a href="/sign-in" className="text-primary font-medium hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </div>
  )
}
