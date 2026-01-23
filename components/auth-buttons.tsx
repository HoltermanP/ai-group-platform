'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { LogIn, User } from 'lucide-react';

// Dynamically import Clerk components to prevent SSR issues
const SignedIn = dynamic(() =>
  import('@clerk/nextjs').then((mod) => ({ default: mod.SignedIn }))
);
const SignedOut = dynamic(() =>
  import('@clerk/nextjs').then((mod) => ({ default: mod.SignedOut }))
);
const SignInButton = dynamic(() =>
  import('@clerk/nextjs').then((mod) => ({ default: mod.SignInButton }))
);
const UserButton = dynamic(() =>
  import('@clerk/nextjs').then((mod) => ({ default: mod.UserButton }))
);

export function AuthButtons() {
  const [mounted, setMounted] = useState(false);
  const [clerkLoaded, setClerkLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if Clerk is available
    if (typeof window !== 'undefined' && window.Clerk) {
      setClerkLoaded(true);
    }
  }, []);

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
    );
  }

  // If Clerk is not loaded, show basic login button that redirects to sign-in page
  if (!clerkLoaded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        asChild
      >
        <a href="/sign-in">
          <LogIn className="h-4 w-4" />
          Inloggen
        </a>
      </Button>
    );
  }

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="outline" size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Inloggen
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
              userButtonPopoverCard: 'shadow-lg border-border',
            },
          }}
          afterSignOutUrl="/"
        />
      </SignedIn>
    </>
  );
}