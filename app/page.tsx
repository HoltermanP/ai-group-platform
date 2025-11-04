import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Shield, Eye, FileSearch } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-6xl font-bold tracking-tight text-foreground">
            AI Group Platform
          </h1>
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
            Intelligente oplossingen voor veiligheid, inspectie en toezicht in de ondergrondse infrastructuur
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row justify-center mt-8">
            <SignedOut>
              <p className="text-lg text-muted-foreground">
                Log in of registreer om toegang te krijgen tot onze AI-gestuurde tools
              </p>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-primary px-10 text-lg text-primary-foreground font-semibold transition-all hover:bg-primary/90 hover:shadow-xl hover:scale-105"
              >
                Ga naar Dashboard
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </SignedIn>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
          {/* AI-Veiligheid */}
          <Link href="/dashboard/ai-safety" className="group">
            <div className="h-full rounded-xl border-2 border-border bg-card p-8 text-left transition-all hover:shadow-2xl hover:border-primary hover:-translate-y-2 duration-300">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-2xl mb-4 text-card-foreground group-hover:text-primary transition-colors">
                AI-Veiligheid
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Detecteer en beheer veiligheidsmeldingen in real-time. Onze AI analyseert incidenten, categoriseert risico's en stelt preventieve maatregelen voor.
              </p>
              <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Meer informatie
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* AI-Schouw */}
          <Link href="/dashboard/ai-schouw" className="group">
            <div className="h-full rounded-xl border-2 border-border bg-card p-8 text-left transition-all hover:shadow-2xl hover:border-primary hover:-translate-y-2 duration-300">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-2xl mb-4 text-card-foreground group-hover:text-primary transition-colors">
                AI-Schouw
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Automatische inspectie van ondergrondse infrastructuur. AI-gedreven beeldherkenning identificeert gebreken, corrosie en structurele problemen.
              </p>
              <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Meer informatie
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* AI-Toezicht */}
          <Link href="/dashboard/ai-toezicht" className="group">
            <div className="h-full rounded-xl border-2 border-border bg-card p-8 text-left transition-all hover:shadow-2xl hover:border-primary hover:-translate-y-2 duration-300">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <FileSearch className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-2xl mb-4 text-card-foreground group-hover:text-primary transition-colors">
                AI-Toezicht
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Continue monitoring en compliance controle. Slimme analyses van projectvoortgang, regelgeving en kwaliteitsnormen voor optimaal beheer.
              </p>
              <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Meer informatie
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-8">
            <h2 className="text-3xl font-bold mb-4 text-card-foreground">
              Klaar om te beginnen?
            </h2>
            <p className="text-muted-foreground mb-6">
              Ontdek hoe onze AI-gestuurde oplossingen uw infrastructuurbeheer naar een hoger niveau tillen.
            </p>
            <SignedOut>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-primary-foreground font-semibold transition-all hover:bg-primary/90 hover:shadow-lg"
                >
                  Gratis starten
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-border px-8 font-semibold transition-all hover:bg-accent hover:border-primary"
                >
                  Inloggen
                </Link>
              </div>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-primary-foreground font-semibold transition-all hover:bg-primary/90 hover:shadow-lg"
              >
                Naar Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </main>
    </div>
  );
}
