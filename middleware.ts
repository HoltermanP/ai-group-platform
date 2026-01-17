// Temporarily disable middleware to avoid Clerk issues
// Authentication will be handled at the component level
export default function middleware() {
  // Simple pass-through - no authentication middleware
  return;
}

// Keep the config for future use
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};