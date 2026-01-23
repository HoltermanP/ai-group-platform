'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Check if Clerk is properly configured - check client-side available keys
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamisch importeren om server-side bundling problemen te voorkomen
const ClerkProvider = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.ClerkProvider),
  {
    ssr: false,
    loading: () => <>{null}</>
  }
);

export function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render ClerkProvider after mounting to avoid hydration issues
  if (!hasClerkKeys) {
    return <>{children}</>;
  }

  if (!mounted) {
    // Return children without ClerkProvider during SSR
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
      }}
    >
      {children}
    </ClerkProvider>
  );
}
