'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk, SignIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Loader2 } from 'lucide-react'

export function Login() {
  const router = useRouter()
  const { isSignedIn, userId } = useAuth()
  const { signOut } = useClerk()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  // If already signed in, check role and redirect
  useEffect(() => {
    async function checkExistingSession() {
      if (isSignedIn && userId) {
        setStatus('Checking admin access...')
        try {
          const roleRes = await fetch('/api/user/role')
          const roleData = await roleRes.json()
          
          if (roleData.user?.isAdmin) {
            setStatus('Redirecting to admin dashboard...')
            router.push('/admin')
          } else {
            // Already signed in but not admin - sign out and show error
            await signOut()
            setError('Access denied. This portal is for administrators only.')
            setStatus('')
          }
        } catch (err) {
          console.error('Role check error:', err)
          setError('Failed to verify admin status. Please try again.')
          setStatus('')
        }
      }
    }
    
    checkExistingSession()
  }, [isSignedIn, userId, router, signOut])

  // Show loading while checking admin status
  if (isSignedIn && status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{status}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            DuukaAfrica
          </h1>
          <p className="text-gray-400 mt-2">Admin Portal</p>
        </div>

        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-white">Admin Login</CardTitle>
            <CardDescription className="text-center text-gray-400">
              This portal is restricted to authorized administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {/* Clerk SignIn Component */}
            <SignIn 
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-transparent border-0 shadow-none",
                  header: "hidden",
                  footer: "hidden",
                  formButtonPrimary: "bg-primary hover:bg-primary/90",
                },
              }}
            />

            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                Unauthorized access is prohibited and monitored.
                <br />
                This portal is for DuukaAfrica administrators only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to main site */}
        <div className="text-center mt-6">
          <a 
            href="/" 
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to DuukaAfrica
          </a>
        </div>
      </div>
    </div>
  )
}
