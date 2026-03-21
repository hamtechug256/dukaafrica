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

  // Handle admin routes
  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    // Require authentication
    if (!userId) {
      const adminLoginUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(adminLoginUrl)
    }
    // Role check happens client-side in the admin pages
    // This is intentional - we check the database role, not Clerk metadata
  }

  // If admin is logged in and tries to access admin login, redirect to admin dashboard
  if (isAdminLoginRoute(req) && userId) {
    const adminDashboardUrl = new URL('/admin', req.url)
    return NextResponse.redirect(adminDashboardUrl)
  }

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
