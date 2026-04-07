import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { generateAccessDeniedResponse } from '@/lib/access-denied'

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
  '/api/homepage(.*)', // Homepage public APIs
  '/api/newsletter(.*)', // Newsletter subscription
  '/admin/login(.*)', // Admin login page must be public
  '/api/admin/security(.*)', // Security API for rate limiting
  '/api/health', // Health check endpoint (no auth needed for diagnostics)
  '/api/cron(.*)', // Cron endpoints use their own Bearer token auth
  '/api/pesapal/ipn(.*)', // Pesapal IPN webhook callback
  '/cart(.*)',
  '/checkout(.*)',
  '/about(.*)',
  '/contact(.*)',
  '/help(.*)',
  '/faq(.*)',
  '/terms(.*)',
  '/privacy(.*)',
  '/shipping(.*)',
  '/returns(.*)',
  '/cookies(.*)',
  '/careers(.*)',
  '/press(.*)',
  '/seller',
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

const isAdminLoginRoute = createRouteMatcher([
  '/admin/login(.*)',
])

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
])

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

const blockedIPs = new Map<string, { until: number }>()

const MAX_SUSPICIOUS_SCORE = 10
const suspiciousActivity = new Map<string, { score: number; lastActivity: number }>()

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')

  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}

function isIPBlocked(ip: string): boolean {
  const block = blockedIPs.get(ip)
  if (!block) return false

  if (Date.now() > block.until) {
    blockedIPs.delete(ip)
    return false
  }

  return true
}

function recordSuspiciousActivity(ip: string, activity: string): void {
  const current = suspiciousActivity.get(ip) || { score: 0, lastActivity: 0 }

  if (Date.now() - current.lastActivity > 3600000) {
    current.score = 0
  }

  current.score += 1
  current.lastActivity = Date.now()

  suspiciousActivity.set(ip, current)

  if (current.score >= MAX_SUSPICIOUS_SCORE) {
    blockedIPs.set(ip, { until: Date.now() + 3600000 })
    console.log('[SECURITY] IP ' + ip + ' blocked due to suspicious activity: ' + activity)
  }
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const url = req.nextUrl
  const ip = getClientIP(req)

  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    if (isIPBlocked(ip)) {
      console.log('[SECURITY] Blocked IP ' + ip + ' attempted to access ' + url.pathname)
      return generateAccessDeniedResponse('blocked')
    }
  }

  // IMPORTANT: Handle API routes FIRST — return 401 JSON for unauthenticated API calls
  // instead of HTML redirects which break fetch() calls
  if (url.pathname.startsWith('/api/')) {
    if (!userId) {
      // For admin API routes, record suspicious activity
      if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
        recordSuspiciousActivity(ip, 'Unauthenticated admin API access attempt')
      }
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Handle admin page routes (non-API) — redirect to login page
  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    if (!userId) {
      recordSuspiciousActivity(ip, 'Unauthenticated admin access attempt')
      const adminLoginUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(adminLoginUrl)
    }
  }

  // Handle seller page routes (non-API) — redirect to sign-in
  if (isSellerRoute(req)) {
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }
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
