'use client';

import { ReactNode } from 'react';

// Check if Clerk is properly configured
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface ClerkProviderWrapperProps {
  children: ReactNode;
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  // If no Clerk keys configured, just render children
  if (!hasClerkKeys) {
    return <>{children}</>;
  }

  // Dynamically import and render ClerkProvider only on client side
  return (
    <ClerkProviderClient>
      {children}
    </ClerkProviderClient>
  );
}

// Separate component that handles the dynamic import
function ClerkProviderClient({ children }: { children: ReactNode }) {
  // Use React.lazy and Suspense for better SSR handling
  const ClerkProvider = require('@clerk/nextjs').ClerkProvider;

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
