import { NextResponse } from 'next/server'

// Check if Clerk is properly configured
const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY;

export default async function middleware(req: any) {
  // If Clerk is not configured, just pass through
  if (!hasClerkKeys) {
    return NextResponse.next();
  }

  try {
    // Only load Clerk when environment variables are available
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');

    const isProtectedRoute = createRouteMatcher([
      '/dashboard(.*)',
      '/admin(.*)',
    ]);

    const clerkMw = clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) await auth.protect();
    });

    return clerkMw(req);
  } catch (error) {
    // If Clerk fails for any reason, continue without authentication
    console.warn('Clerk middleware failed, continuing without authentication:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}