import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Check if we're in build time (when environment variables might not be available)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                   (process.env.NODE_ENV === 'production' && !process.env.VERCEL && typeof window === 'undefined');

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/admin(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Skip Clerk authentication during build time
  if (isBuildTime) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}