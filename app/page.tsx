import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-background">
      <main className="flex flex-col items-center justify-center gap-8 px-8 py-16 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Welkom bij AI Group Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Een moderne platform gebouwd met Next.js en Clerk authenticatie
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row mt-4">
          <SignedOut>
            <p className="text-muted-foreground">
              Log in of registreer om toegang te krijgen tot het dashboard
            </p>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-primary-foreground font-medium transition-all hover:bg-primary/90 hover:shadow-lg hover:scale-105"
            >
              Ga naar Dashboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </SignedIn>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3 max-w-4xl">
          <div className="rounded-lg border border-border bg-card p-6 text-left transition-all hover:shadow-lg hover:border-primary/50">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="font-semibold text-lg mb-2 text-card-foreground">Veilige Authenticatie</h3>
            <p className="text-sm text-muted-foreground">
              Powered by Clerk voor betrouwbare gebruikersauthenticatie
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 text-left transition-all hover:shadow-lg hover:border-primary/50">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-lg mb-2 text-card-foreground">Next.js 15</h3>
            <p className="text-sm text-muted-foreground">
              Gebouwd met de nieuwste Next.js App Router
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 text-left transition-all hover:shadow-lg hover:border-primary/50">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="font-semibold text-lg mb-2 text-card-foreground">Modern Design</h3>
            <p className="text-sm text-muted-foreground">
              Shadcn UI componenten met dark mode support
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
