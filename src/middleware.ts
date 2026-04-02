import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// Public routes - accessible without authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/products(.*)',
  '/categories(.*)',
  '/stores(.*)',
  '/search(.*)',
  '/api/categories(.*)',
  '/api/user/role', // Needed for role checking
  '/api/products(.*)',
  '/api/stores(.*)',
  '/api/search(.*)',
  '/api/homepage(.*)', // Homepage public APIs (featured, flash-sales, categories, stats, featured-sellers)
  '/api/health(.*)', // Health check endpoint
  '/admin/login(.*)', // Admin login page must be public
  '/api/admin/security(.*)', // Security API for rate limiting
  // SECURITY FIX: Debug endpoint removed from public routes
  '/api/cron(.*)', // Cron endpoints use their own Bearer token auth
  '/api/payments/mpesa/callback(.*)', // M-Pesa callback (no auth from Safaricom)
  '/api/payments/airtel/callback(.*)', // Airtel Money callback (no auth from Airtel)
  '/api/payments/mtn/callback(.*)', // MTN MoMo callback (no auth from MTN)
  // Cart and checkout - accessible (cart uses local storage)
  '/cart(.*)',
  '/checkout(.*)',
  // Static/Info pages - public
  '/about(.*)',
  '/contact(.*)',
  '/help(.*)',
  '/faq(.*)',
  '/terms(.*)',
  '/privacy(.*)',
  '/shipping(.*)',
  '/returns(.*)',
  '/careers(.*)',
  '/press(.*)',
  // Seller info pages (not dashboard) - public for marketing
  '/seller', // Seller landing page
  '/seller/register(.*)',
  '/seller/login(.*)',
  '/seller/guidelines(.*)',
  '/seller/resources(.*)',
  '/seller/fees(.*)',
  '/seller/how-it-works(.*)',
  '/seller/apply(.*)',
  '/seller/learn-more(.*)',
  '/seller/onboarding(.*)',
])

// Admin login route - accessible but redirects logged-in admins to dashboard
const isAdminLoginRoute = createRouteMatcher([
  '/admin/login(.*)',
])

// Admin protected routes - require authentication + admin role
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
])

// Seller routes - require authentication (but not info pages like /seller/fees, /seller/resources)
const isSellerRoute = createRouteMatcher([
  '/seller/dashboard(.*)',
  '/seller/products(.*)',
  '/seller/orders(.*)',
  '/seller/analytics(.*)',
  '/seller/settings(.*)',
  '/seller/messages(.*)',
  '/seller/payouts(.*)',
  '/api/seller(.*)',
])

// Simple in-memory blocklist (would use Redis/database in production)
const blockedIPs = new Map<string, { until: number }>()

// Maximum suspicious activity score before blocking
const MAX_SUSPICIOUS_SCORE = 10
const suspiciousActivity = new Map<string, { score: number; lastActivity: number }>()

/**
 * Get client IP from request
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown'
}

/**
 * Check if IP is blocked
 */
function isIPBlocked(ip: string): boolean {
  const block = blockedIPs.get(ip)
  if (!block) return false
  
  if (Date.now() > block.until) {
    blockedIPs.delete(ip)
    return false
  }
  
  return true
}

/**
 * Record suspicious activity and potentially block IP
 */
function recordSuspiciousActivity(ip: string, activity: string): void {
  const current = suspiciousActivity.get(ip) || { score: 0, lastActivity: 0 }
  
  // Reset score after 1 hour of inactivity
  if (Date.now() - current.lastActivity > 3600000) {
    current.score = 0
  }
  
  current.score += 1
  current.lastActivity = Date.now()
  
  suspiciousActivity.set(ip, current)
  
  // Block if score exceeds threshold
  if (current.score >= MAX_SUSPICIOUS_SCORE) {
    blockedIPs.set(ip, { until: Date.now() + 3600000 }) // 1 hour block
    console.log(`[SECURITY] IP ${ip} blocked due to suspicious activity: ${activity}`)
  }
}

/**
 * Generate Access Denied HTML response
 */
function generateAccessDeniedResponse(reason: 'blocked' | 'unauthorized' | 'suspicious', remainingMinutes?: number): NextResponse {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied - DuukaAfrica Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes ping {
      75%, 100% { transform: scale(2); opacity: 0; }
    }
    .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
  <div class="max-w-lg w-full">
    <!-- Warning Header -->
    <div class="bg-red-500/10 border border-red-500/30 rounded-t-lg p-3 flex items-center justify-center gap-2">
      <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
      </svg>
      <span class="text-red-400 text-sm font-medium tracking-wider uppercase">Restricted Access Zone</span>
    </div>
    
    <!-- Main Card -->
    <div class="bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-b-lg shadow-2xl">
      <div class="p-8 text-center">
        <!-- Icon -->
        <div class="flex justify-center mb-6">
          <div class="relative">
            <div class="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
            <div class="relative bg-gray-800 p-6 rounded-full border border-gray-700">
              ${reason === 'blocked' ? `
                <svg class="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                </svg>
              ` : reason === 'suspicious' ? `
                <svg class="w-20 h-20 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              ` : `
                <svg class="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              `}
            </div>
          </div>
        </div>
        
        <!-- Title -->
        <h1 class="text-3xl font-bold text-white mb-2">
          ${reason === 'blocked' ? 'Access Permanently Restricted' : reason === 'suspicious' ? 'Suspicious Activity Detected' : 'Access Denied'}
        </h1>
        
        <!-- Subtitle -->
        <p class="text-lg text-gray-400 mb-4">
          ${reason === 'blocked' ? 'Your access has been blocked due to suspicious activity' : reason === 'suspicious' ? 'Your access has been flagged for review' : 'You are not authorized to access this area'}
        </p>
        
        <!-- Description -->
        <p class="text-gray-500 mb-6 leading-relaxed">
          ${reason === 'blocked' 
            ? 'Our security systems have detected unusual activity from your connection. This decision is final and cannot be appealed through this interface.' 
            : reason === 'suspicious'
            ? 'Our automated security systems have identified potentially malicious behavior from your connection. This incident has been logged.'
            : 'This administrative portal is exclusively for authorized DuukaAfrica administrators. If you believe this is an error, contact the system administrator.'}
        </p>
        
        ${remainingMinutes ? `
        <!-- Timer -->
        <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-center gap-2 text-orange-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="font-mono text-2xl">${remainingMinutes}:00</span>
            <span class="text-sm">minutes remaining</span>
          </div>
        </div>
        ` : ''}
        
        <!-- Security Notice -->
        <div class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            <div class="text-left">
              <p class="text-sm text-gray-400">
                <strong class="text-gray-300">Security Notice:</strong> This incident has been logged and monitored.
                Unauthorized access attempts are recorded and may be reported to relevant authorities.
                All administrative actions require proper authorization.
              </p>
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="space-y-3">
          <a href="/" class="block w-full py-2 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors text-center">
            <span class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Return to Homepage
            </span>
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="border-t border-gray-800 p-4 bg-gray-900/50">
        <p class="text-xs text-gray-600 text-center">
          DuukaAfrica Administrative Portal • Protected by Advanced Security Systems
          <br>
          <span class="text-gray-700">Unauthorized access is strictly prohibited.</span>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`
  
  const response = new NextResponse(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    }
  })
  
  return response
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  const url = req.nextUrl
  const ip = getClientIP(req)

  // Allow all public routes to pass through without any checks
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Check if IP is blocked for admin routes
  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    if (isIPBlocked(ip)) {
      console.log(`[SECURITY] Blocked IP ${ip} attempted to access ${url.pathname}`)
      return generateAccessDeniedResponse('blocked')
    }
  }

  // Handle admin routes (excluding admin/login which is public)
  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    // Require authentication
    if (!userId) {
      // Record suspicious activity for unauthenticated admin access attempts
      recordSuspiciousActivity(ip, 'Unauthenticated admin access attempt')

      const adminLoginUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(adminLoginUrl)
    }
    // Role check happens in the admin pages and API routes
    // We check the database role, not Clerk metadata
  }

  // Handle seller routes
  if (isSellerRoute(req)) {
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  // For API routes that require authentication, return 401 JSON instead of redirect
  if (url.pathname.startsWith('/api/')) {
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // For all other routes (like dashboard, cart, etc.), require authentication
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
