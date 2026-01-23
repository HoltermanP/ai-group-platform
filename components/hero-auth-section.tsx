'use client';

import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import Clerk components to prevent SSR issues
const SignedIn = dynamic(
  () => import("@clerk/nextjs").then((mod) => ({ default: mod.SignedIn })),
  { ssr: false }
);
const SignedOut = dynamic(
  () => import("@clerk/nextjs").then((mod) => ({ default: mod.SignedOut })),
  { ssr: false }
);

export function HeroAuthSection() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row justify-center mt-6 sm:mt-8">
      <SignedOut>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground px-4">
          Log in of registreer om toegang te krijgen tot onze AI-gestuurde tools
        </p>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex h-12 sm:h-14 items-center justify-center gap-2 rounded-lg bg-primary px-6 sm:px-8 md:px-10 text-base sm:text-lg text-primary-foreground font-semibold transition-all hover:bg-primary/90 hover:shadow-xl hover:scale-105"
        >
          Ga naar Dashboard
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </SignedIn>
    </div>
  );
}