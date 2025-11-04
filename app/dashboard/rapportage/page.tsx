import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, BarChart3, TrendingUp, Download } from "lucide-react";
import { Card } from "@/components/ui/card";

export default async function RapportagePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  const reportTypes = [
    {
      title: "Veiligheidsrapportage",
      description: "Gedetailleerde analyses en trends van veiligheidsmeldingen",
      href: "/dashboard/ai-safety/analytics",
      icon: BarChart3,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Projectrapportage",
      description: "Uitgebreide analyses en inzichten voor projectbeheer en portfolio management",
      href: "/dashboard/projects/analytics",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Schouwrapportage",
      description: "Rapportages van uitgevoerde schouwen en inspecties",
      href: "/dashboard/ai-schouw/analytics",
      icon: FileText,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Toezichtrapportage",
      description: "Rapportages van kwaliteitscontrole en toezicht",
      href: "/dashboard/ai-toezicht/analytics",
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-foreground">Rapportage</h1>
            <p className="text-muted-foreground">
              Overzicht van alle beschikbare rapportages en analyses
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <Link
                  key={report.href}
                  href={report.href}
                  className="group block"
                >
                  <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
                    <div className="flex items-start gap-4 px-6">
                      <div className={`p-3 rounded-lg ${report.bgColor} ${report.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-card-foreground mb-2 group-hover:text-primary transition-colors">
                          {report.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {report.description}
                        </p>
                        <div className="flex items-center text-sm text-primary group-hover:gap-2 transition-all font-medium">
                          Bekijk rapportage
                          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="mt-8">
                  <Card className="bg-muted/50">
              <div className="flex items-start gap-4 px-6">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <Download className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    Export & Download
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
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

