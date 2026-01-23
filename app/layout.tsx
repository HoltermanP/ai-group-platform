import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Link from "next/link";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "AI Group Platform",
  description: "Platform voor veiligheidsinspecties en AI-ondersteunde workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="theme-slate"
          enableSystem={false}
          storageKey="ai-group-theme"
        >
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
              <div className="flex justify-between items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4 md:gap-8 min-w-0 flex-1">
                  <Link href="/" className="text-lg sm:text-xl font-bold text-foreground hover:text-primary transition-colors truncate">
                    AI Group Platform
                  </Link>
                </div>
                <div className="flex gap-1.5 sm:gap-2 md:gap-3 items-center shrink-0">
                  <ThemeSwitcher />
                  <Link
                    href="/setup"
                    className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all hover:shadow-md text-sm sm:text-base"
                  >
                    Setup
                  </Link>
                </div>
              </div>
            </div>
          </header>
          <ClerkProviderWrapper>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ClerkProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
