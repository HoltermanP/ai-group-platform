'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// In client components is alleen NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY beschikbaar
// CLERK_SECRET_KEY is alleen server-side beschikbaar
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamisch importeren om server-side bundling problemen te voorkomen
const SignUp = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignUp),
  { 
    ssr: false,
    loading: () => (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="text-center">Laden...</div>
      </div>
    )
  }
);

export default function SignUpPage() {
  if (!hasClerkKeys) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Clerk niet geconfigureerd</h1>
          <p className="text-muted-foreground">
            Clerk authenticatie is niet ingesteld. Configureer NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY en CLERK_SECRET_KEY.
          </p>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-primary-foreground font-semibold transition-all hover:bg-primary/90"
          >
            Terug naar home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-8">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg"
          }
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
      />
    </div>
  );
}
