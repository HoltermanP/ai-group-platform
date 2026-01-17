import { NextRequest } from 'next/server';

// Check if Clerk is properly configured
const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY;

// Wrapper for Clerk auth() function with fallback
export async function safeAuth() {
  if (!hasClerkKeys) {
    return { userId: null };
  }

  try {
    const { auth } = await import('@clerk/nextjs/server');
    return await auth();
  } catch (error) {
    console.warn('Clerk auth() failed, using fallback:', error);
    return { userId: null };
  }
}

// Wrapper for currentUser() function
export async function safeCurrentUser() {
  if (!hasClerkKeys) {
    return null;
  }

  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    return await currentUser();
  } catch (error) {
    console.warn('Clerk currentUser() failed, using fallback:', error);
    return null;
  }
}

// Wrapper for API route auth check
export async function requireAuth() {
  const authResult = await safeAuth();

  if (!authResult.userId) {
    throw new Response('Unauthorized', {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return authResult;
}