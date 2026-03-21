import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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
  '/admin/login(.*)', // Admin login page must be public
  '/api/debug(.*)', // Debug endpoints (temporary)
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

// Seller routes - require authentication
const isSellerRoute = createRouteMatcher([
  '/seller(.*)',
  '/api/seller(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  const url = req.nextUrl

  // Handle admin routes (excluding admin/login which is public)
  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    // Require authentication
    if (!userId) {
      const adminLoginUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(adminLoginUrl)
    }
    // Role check happens in the admin pages and API routes
    // We check the database role, not Clerk metadata
  }

  // Note: We don't redirect logged-in users from /admin/login to /admin
  // because the admin login page handles this - it checks if the user
  // is already logged in and has admin role, then redirects accordingly.
  // This prevents redirect loops for logged-in non-admin users.

  // Handle seller routes
  if (isSellerRoute(req)) {
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
