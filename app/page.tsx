import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { ModuleCard } from "@/components/module-card";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* Hero Section */}
        <div className="text-center space-y-4 sm:space-y-6 mb-8 sm:mb-12 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            AI Group Platform
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto px-2">
            Intelligente oplossingen voor veiligheid, inspectie en toezicht in de ondergrondse infrastructuur
          </p>
          
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
        </div>

        {/* Feature Cards */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {/* AI-Veiligheid */}
          <ModuleCard
            href="/dashboard/ai-safety"
            iconName="shield"
            title="AI-Veiligheid"
            description="Detecteer en beheer veiligheidsmeldingen in real-time. Onze AI analyseert incidenten, categoriseert risico's en stelt preventieve maatregelen voor."
            module="ai-safety"
          />

          {/* AI-Schouw */}
          <ModuleCard
            href="/dashboard/ai-schouw"
            iconName="eye"
            title="AI-Schouw"
            description="Automatische inspectie van ondergrondse infrastructuur. AI-gedreven beeldherkenning identificeert gebreken, corrosie en structurele problemen."
            module="ai-schouw"
          />

          {/* AI-Toezicht */}
          <ModuleCard
            href="/dashboard/ai-toezicht"
            iconName="fileSearch"
            title="AI-Toezicht"
            description="Continue monitoring en compliance controle. Slimme analyses van projectvoortgang, regelgeving en kwaliteitsnormen voor optimaal beheer."
            module="ai-toezicht"
          />
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-12 sm:mt-16 md:mt-20 text-center max-w-3xl mx-auto px-4">
          <div className="rounded-xl sm:rounded-2xl border border-border bg-card/50 backdrop-blur p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-card-foreground">
              Klaar om te beginnen?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              Ontdek hoe onze AI-gestuurde oplossingen uw infrastructuurbeheer naar een hoger niveau tillen.
            </p>
            <SignedOut>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="inline-flex h-11 sm:h-12 items-center justify-center rounded-lg bg-primary px-6 sm:px-8 text-primary-foreground font-semibold transition-all hover:bg-primary/90 hover:shadow-lg text-sm sm:text-base"
                >
                  Gratis starten
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex h-11 sm:h-12 items-center justify-center rounded-lg border-2 border-border px-6 sm:px-8 font-semibold transition-all hover:bg-accent hover:border-primary text-sm sm:text-base"
                >
                  Inloggen
                </Link>
              </div>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex h-11 sm:h-12 items-center justify-center rounded-lg bg-primary px-6 sm:px-8 text-primary-foreground font-semibold transition-all hover:bg-primary/90 hover:shadow-lg text-sm sm:text-base"
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
