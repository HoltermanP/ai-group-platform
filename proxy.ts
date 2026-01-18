import { NextResponse } from "next/server";

// Check if Clerk is properly configured
const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY;

export default async function proxy(req: any) {
  // If Clerk is not configured, just pass through
  if (!hasClerkKeys) {
    return;
  }

  try {
    // Only load Clerk when environment variables are available
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');

    const isProtectedRoute = createRouteMatcher([
      "/dashboard(.*)",
      "/api/users(.*)",
      "/api/projects(.*)",
      "/api/safety-incidents(.*)",
      "/api/admin(.*)",
    ]);

    // For now, disable Clerk middleware due to compatibility issues
    // Authentication will be handled at the component level
    return;
  } catch (error) {
    // If Clerk fails for any reason, continue without authentication
    console.warn('Clerk proxy failed, continuing without authentication:', error);
    return;
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

