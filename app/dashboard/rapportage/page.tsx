import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, BarChart3, TrendingUp, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getUserModulePermissions } from "@/lib/clerk-admin";

export default async function RapportagePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  // Haal module rechten op
  const modulePermissions = await getUserModulePermissions(userId);

  const allReportTypes = [
    {
      title: "Veiligheidsrapportage",
      description: "Gedetailleerde analyses en trends van veiligheidsmeldingen",
      href: "/dashboard/ai-safety/analytics",
      icon: BarChart3,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      module: "ai-safety" as const,
    },
    {
      title: "Projectrapportage",
      description: "Uitgebreide analyses en inzichten voor projectbeheer en portfolio management",
      href: "/dashboard/projects/analytics",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      module: null, // Algemeen beschikbaar, geen specifieke module
    },
    {
      title: "Schouwrapportage",
      description: "Rapportages van uitgevoerde schouwen en inspecties",
      href: "/dashboard/ai-schouw/analytics",
      icon: FileText,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
      module: "ai-schouw" as const,
    },
    {
      title: "Toezichtrapportage",
      description: "Rapportages van kwaliteitscontrole en toezicht",
      href: "/dashboard/ai-toezicht/analytics",
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      module: "ai-toezicht" as const,
    },
  ];

  // Filter rapportages op basis van module rechten
  const reportTypes = allReportTypes.filter((report) => {
    // Als er geen specifieke module is (algemeen), altijd tonen
    if (report.module === null) {
      return true;
    }
    // Toon alleen als gebruiker toegang heeft tot de module
    return modulePermissions[report.module] === true;
  });

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-foreground">Rapportage</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Overzicht van alle beschikbare rapportages en analyses
            </p>
          </div>

          {reportTypes.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <Link
                    key={report.href}
                    href={report.href}
                    className="group block"
                  >
                    <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
                      <div className="flex items-start gap-3 sm:gap-4 p-4 sm:px-6 sm:py-5">
                        <div className={`p-2 sm:p-3 rounded-lg ${report.bgColor} ${report.color} shrink-0`}>
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg text-card-foreground mb-2 group-hover:text-primary transition-colors">
                            {report.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                            {report.description}
                          </p>
                          <div className="flex items-center text-xs sm:text-sm text-primary group-hover:gap-2 transition-all font-medium">
                            Bekijk rapportage
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-2">
                Geen rapportages beschikbaar
              </p>
              <p className="text-sm text-muted-foreground">
                Je hebt momenteel geen toegang tot rapportages. Neem contact op met een beheerder om toegang te krijgen.
              </p>
            </Card>
          )}

          <div className="mt-6 sm:mt-8">
            <Card className="bg-muted/50">
              <div className="flex items-start gap-3 sm:gap-4 p-4 sm:px-6 sm:py-5">
                <div className="p-2 sm:p-3 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Download className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2">
                    Export & Download
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Exporteer rapportages naar verschillende formaten zoals PDF, Excel of CSV voor verdere analyse en delen met stakeholders.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Binnenkort beschikbaar
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

