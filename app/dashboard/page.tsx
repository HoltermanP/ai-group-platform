import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projectsTable, safetyIncidentsTable } from "@/lib/db/schema";
import { getUserOrganizationIds, isAdmin } from "@/lib/clerk-admin";
import { eq, sql, or, isNull, inArray } from "drizzle-orm";

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  const user = await currentUser();
  
  // Haal organisatie IDs op voor filtering
  const userIsAdmin = await isAdmin();
  const userOrgIds = await getUserOrganizationIds(userId);
  
  // Haal project statistieken op
  const projectsQuery = db
    .select({
      total: sql<number>`cast(count(*) as integer)`,
      active: sql<number>`cast(count(*) filter (where ${projectsTable.status} = 'active') as integer)`,
      onHold: sql<number>`cast(count(*) filter (where ${projectsTable.status} = 'on-hold') as integer)`,
      completed: sql<number>`cast(count(*) filter (where ${projectsTable.status} = 'completed') as integer)`,
    })
    .from(projectsTable);
  
  let projectStats;
  if (!userIsAdmin && userOrgIds.length > 0) {
    projectStats = await projectsQuery.where(
      or(
        inArray(projectsTable.organizationId, userOrgIds),
        isNull(projectsTable.organizationId)
      )
    );
  } else if (!userIsAdmin) {
    projectStats = await projectsQuery.where(isNull(projectsTable.organizationId));
  } else {
    projectStats = await projectsQuery;
  }
  const projectStatsData = projectStats[0] || { total: 0, active: 0, onHold: 0, completed: 0 };
  
  // Haal veiligheidsmelding statistieken op
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const incidentsQuery = db
    .select({
      total: sql<number>`cast(count(*) as integer)`,
      open: sql<number>`cast(count(*) filter (where ${safetyIncidentsTable.status} = 'open') as integer)`,
      critical: sql<number>`cast(count(*) filter (where ${safetyIncidentsTable.severity} = 'critical') as integer)`,
      high: sql<number>`cast(count(*) filter (where ${safetyIncidentsTable.severity} = 'high') as integer)`,
      recent: sql<number>`cast(count(*) filter (where ${safetyIncidentsTable.reportedDate} >= ${sevenDaysAgo}::timestamp) as integer)`,
    })
    .from(safetyIncidentsTable);
  
  let incidentStats;
  if (!userIsAdmin && userOrgIds.length > 0) {
    incidentStats = await incidentsQuery.where(
      or(
        inArray(safetyIncidentsTable.organizationId, userOrgIds),
        isNull(safetyIncidentsTable.organizationId)
      )
    );
  } else if (!userIsAdmin) {
    incidentStats = await incidentsQuery.where(isNull(safetyIncidentsTable.organizationId));
  } else {
    incidentStats = await incidentsQuery;
  }
  const incidentStatsData = incidentStats[0] || { total: 0, open: 0, critical: 0, high: 0, recent: 0 };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welkom terug, {user?.firstName || user?.emailAddresses[0]?.emailAddress}!
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/projects" className="rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-chart-3/10 text-chart-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-card-foreground">Projecten</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 min-h-[2.5rem]">
                Beheer je projecten en voeg nieuwe toe
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Totaal</span>
                  <span className="text-lg font-semibold text-card-foreground">{projectStatsData.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Actief</span>
                  <span className="text-sm font-medium text-chart-3">{projectStatsData.active}</span>
                </div>
                {projectStatsData.onHold > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Op hold</span>
                    <span className="text-sm font-medium text-muted-foreground">{projectStatsData.onHold}</span>
                  </div>
                )}
                {projectStatsData.completed > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Voltooid</span>
                    <span className="text-sm font-medium text-muted-foreground">{projectStatsData.completed}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-xs text-primary group-hover:text-primary/80 transition-colors font-medium">
                  Bekijk alle projecten →
                </span>
              </div>
            </Link>

            <Link href="/dashboard/ai-safety" className="rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-destructive/50 cursor-pointer group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-card-foreground">Veiligheidsmeldingen</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 min-h-[2.5rem]">
                Beheer veiligheidsmeldingen en analyses
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Totaal</span>
                  <span className="text-lg font-semibold text-card-foreground">{incidentStatsData.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Open</span>
                  <span className="text-sm font-medium text-destructive">{incidentStatsData.open}</span>
                </div>
                {incidentStatsData.critical > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Kritiek</span>
                    <span className="text-sm font-medium text-destructive">{incidentStatsData.critical}</span>
                  </div>
                )}
                {incidentStatsData.high > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hoog</span>
                    <span className="text-sm font-medium text-orange-500">{incidentStatsData.high}</span>
                  </div>
                )}
                {incidentStatsData.recent > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Laatste 7 dagen</span>
                    <span className="text-sm font-medium text-card-foreground">{incidentStatsData.recent}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-xs text-primary group-hover:text-primary/80 transition-colors font-medium">
                  Bekijk alle meldingen →
                </span>
              </div>
            </Link>

            <div className="rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-card-foreground">Profiel</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Beheer je profielinformatie en voorkeuren
              </p>
              <div className="text-sm space-y-2 pt-4 border-t border-border">
                <p className="text-card-foreground"><span className="font-medium text-muted-foreground">Email:</span> {user?.emailAddresses[0]?.emailAddress}</p>
                {user?.firstName && (
                  <p className="text-card-foreground"><span className="font-medium text-muted-foreground">Naam:</span> {user.firstName} {user.lastName}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-chart-1/10 text-chart-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-card-foreground">Statistieken</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Je account statistieken en activiteit
              </p>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Activiteit</span>
                  <span className="text-xs font-medium text-chart-1">Binnenkort beschikbaar</span>
                </div>
              </div>
            </div>

            <Link href="/dashboard/instellingen" className="rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-chart-3/10 text-chart-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-card-foreground">Instellingen</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Pas je applicatie instellingen aan
              </p>
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-xs text-primary group-hover:text-primary/80 transition-colors font-medium">
                  Beheer instellingen →
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

