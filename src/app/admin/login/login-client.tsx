'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn, useClerk, useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  Loader2, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Lock,
  Ban,
  Clock
} from 'lucide-react'
import { AccessDeniedPage } from '@/components/admin/access-denied-page'

export function Login() {
  const router = useRouter()
  const { signIn } = useSignIn()
  const { setActive, signOut } = useClerk()
  const { isSignedIn, userId, isLoaded } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  
  // Security state
  const [isBlocked, setIsBlocked] = useState(false)
  const [remainingMinutes, setRemainingMinutes] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [delaySeconds, setDelaySeconds] = useState(0)
  const [showAccessDenied, setShowAccessDenied] = useState(false)

  // Check security status on mount
  useEffect(() => {
    async function checkSecurityStatus() {
      try {
        const res = await fetch('/api/admin/security')
        const data = await res.json()
        
        if (data.blocked) {
          setIsBlocked(true)
          setRemainingMinutes(data.remainingMinutes || 60)
          setShowAccessDenied(true)
        }
        
        setAttemptCount(data.attemptCount || 0)
      } catch (err) {
        console.error('Failed to check security status:', err)
      }
    }
    
    checkSecurityStatus()
  }, [])

  // If already signed in, check role and redirect
  useEffect(() => {
    async function checkExistingSession() {
      if (isSignedIn && userId && isLoaded) {
        setStatus('Checking admin access...')
        try {
          const roleRes = await fetch('/api/user/role')
          const roleData = await roleRes.json()
          
          if (roleData.user?.isAdmin) {
            setStatus('Redirecting to admin dashboard...')
            // Clear failed attempts on successful login
            await fetch('/api/admin/security', { method: 'DELETE' })
            router.push('/admin')
          } else {
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
  }, [isSignedIn, userId, isLoaded, router, signOut])

  // Countdown timer for delay
  useEffect(() => {
    if (delaySeconds > 0) {
      const timer = setTimeout(() => setDelaySeconds(d => d - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [delaySeconds])

  // Show access denied page if blocked
  if (showAccessDenied) {
    return (
      <AccessDeniedPage 
        reason="rate_limited" 
        remainingMinutes={remainingMinutes}
        message="Too many failed login attempts have been detected from your connection. For security reasons, your access has been temporarily restricted."
      />
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('')
    
    // Check if there's a delay
    if (delaySeconds > 0) {
      setError(`Please wait ${delaySeconds} seconds before trying again.`)
      return
    }
    
    setIsLoading(true)

    try {
      if (!isLoaded || !signIn) {
        setError('Authentication service is still loading. Please wait...')
        setIsLoading(false)
        return
      }

      setStatus('Authenticating...')

      // Clerk v7 sign in flow:
      // 1. Create sign-in with identifier (email)
      const createResult = await signIn.create({
        identifier: email,
      })

      if (createResult.error) {
        const errorCode = (createResult.error as any)?.errors?.[0]?.code
        
        // Record failed attempt
        const securityRes = await fetch('/api/admin/security', { method: 'POST' })
        const securityData = await securityRes.json()
        
        setAttemptCount(securityData.attempts)
        
        if (securityData.blocked) {
          setIsBlocked(true)
          setRemainingMinutes(securityData.remainingMinutes)
          setShowAccessDenied(true)
          return
        }
        
        setDelaySeconds(securityData.delay || 0)
        
        if (errorCode === 'form_identifier_not_found') {
          setError('Invalid credentials. Please try again.')
        } else {
          setError(securityData.message || 'Authentication failed.')
        }
        setStatus('')
        setIsLoading(false)
        return
      }

      // 2. Submit password
      const passwordResult = await signIn.password({ password })

      if (passwordResult.error) {
        const errorCode = (passwordResult.error as any)?.errors?.[0]?.code
        
        // Record failed attempt
        const securityRes = await fetch('/api/admin/security', { method: 'POST' })
        const securityData = await securityRes.json()
        
        setAttemptCount(securityData.attempts)
        
        if (securityData.blocked) {
          setIsBlocked(true)
          setRemainingMinutes(securityData.remainingMinutes)
          setShowAccessDenied(true)
          return
        }
        
        setDelaySeconds(securityData.delay || 0)
        
        if (errorCode === 'form_password_incorrect') {
          setError(securityData.message || 'Invalid credentials.')
        } else if (errorCode === 'too_many_attempts') {
          setError('Too many failed attempts. Your access has been temporarily restricted.')
          setIsBlocked(true)
          setShowAccessDenied(true)
        } else {
          setError(securityData.message || 'Authentication failed.')
        }
        setStatus('')
        setIsLoading(false)
        return
      }

      // 3. Check if sign-in is complete
      if (signIn.status === 'complete' && signIn.createdSessionId) {
        setStatus('Verifying admin privileges...')
        
        await setActive({ session: signIn.createdSessionId })

        // Check if user is admin
        const roleRes = await fetch('/api/user/role')
        const roleData = await roleRes.json()

        if (roleData.user?.isAdmin) {
          // Clear failed attempts on successful login
          await fetch('/api/admin/security', { method: 'DELETE' })
          
          setStatus('Access granted! Redirecting...')
          setTimeout(() => {
            router.push('/admin')
          }, 500)
        } else {
          // Record failed attempt (non-admin trying to access)
          await fetch('/api/admin/security', { method: 'POST' })
          
          await signOut()
          setError('Access denied. This portal is for administrators only.')
          setStatus('')
        }
      } else {
        setError(`Authentication incomplete. Status: ${signIn.status}`)
        setStatus('')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err?.message || 'Login failed. Please try again.')
      setStatus('')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate progress for remaining attempts
  const attemptProgress = (attemptCount / 5) * 100

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
            {/* Attempt Progress Warning */}
            {attemptCount > 0 && !isBlocked && (
              <Alert className="mb-4 bg-yellow-900/20 border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-400">
                  <div className="flex justify-between items-center mb-2">
                    <span>Failed attempts: {attemptCount}/5</span>
                    <span className="text-xs">{5 - attemptCount} remaining</span>
                  </div>
                  <Progress 
                    value={attemptProgress} 
                    className="h-2 bg-yellow-900/50"
                  />
                </AlertDescription>
              </Alert>
            )}

            {/* Delay Warning */}
            {delaySeconds > 0 && (
              <Alert className="mb-4 bg-orange-900/20 border-orange-800">
                <Clock className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-400">
                  Please wait {delaySeconds} seconds before your next attempt.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {status && !error && (
                <Alert className="bg-green-900/20 border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-400">{status}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@duukaafrica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || delaySeconds > 0}
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading || delaySeconds > 0}
                    className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLoaded ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled
                >
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing authentication...
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email || !password || delaySeconds > 0 || isBlocked}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : delaySeconds > 0 ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Wait {delaySeconds}s
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Sign in to Admin Portal
                    </>
                  )}
                </Button>
              )}
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                <span>Protected by advanced security systems</span>
              </div>
              <p className="text-xs text-gray-600 text-center mt-2">
                Unauthorized access is prohibited and monitored.
                <br />
                All login attempts are logged and analyzed.
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
