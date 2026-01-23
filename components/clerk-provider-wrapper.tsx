'use client';

import { ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Check if Clerk is properly configured
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamically import ClerkProvider
const ClerkProvider = dynamic(
  () => import('@clerk/nextjs').then((mod) => ({ default: mod.ClerkProvider })),
  { ssr: false }
);

interface ClerkProviderWrapperProps {
  children: ReactNode;
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If no Clerk keys configured, just render children
  if (!hasClerkKeys) {
    return <>{children}</>;
  }

  // Wait for client-side mount before rendering ClerkProvider
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: 'hsl(var(--primary))',
          colorBackground: 'hsl(var(--background))',
          colorInputBackground: 'hsl(var(--background))',
          colorInputText: 'hsl(var(--foreground))',
          colorText: 'hsl(var(--foreground))',
        },
        elements: {
          modalContent: {
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
          },
          card: {
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          },
          headerTitle: {
            color: 'hsl(var(--foreground))',
          },
          headerSubtitle: {
            color: 'hsl(var(--muted-foreground))',
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
