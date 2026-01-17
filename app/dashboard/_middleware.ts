import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware om static generation uit te schakelen voor dashboard pagina's
export function middleware(request: NextRequest) {
  // Voeg headers toe om static generation uit te schakelen
  const response = NextResponse.next();
  response.headers.set('x-middleware-cache', 'no-cache');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};