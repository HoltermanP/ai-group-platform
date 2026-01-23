'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Check if Clerk is properly configured - check client-side available keys
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamisch importeren voor client-side rendering
const ClerkProvider = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.ClerkProvider),
  {
    ssr: false,
    loading: () => <>{null}</>
  }
);

// Server-side fallback provider voor SSR/build time
function ClerkProviderSSR({ children, ...props }: any) {
  return <>{children}</>;
}

export function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If no Clerk keys configured, just render children
  if (!hasClerkKeys) {
    return <>{children}</>;
  }

  // During SSR/build time, use fallback provider
  if (typeof window === 'undefined' || !mounted) {
    return (
      <ClerkProviderSSR>
        {children}
      </ClerkProviderSSR>
    );
  }

  // Client-side: use full ClerkProvider
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
