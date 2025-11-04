import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projectsTable, safetyIncidentsTable, inspectionsTable, supervisionsTable } from "@/lib/db/schema";
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
  
  // Haal schouw statistieken op (met error handling voor als de tabel nog niet bestaat)
  let inspectionStatsData = { total: 0, open: 0, in_behandeling: 0, afgerond: 0, goedgekeurd: 0, recent: 0 };
  try {
    const inspectionsQuery = db
      .select({
        total: sql<number>`cast(count(*) as integer)`,
        open: sql<number>`cast(count(*) filter (where ${inspectionsTable.status} = 'open') as integer)`,
        in_behandeling: sql<number>`cast(count(*) filter (where ${inspectionsTable.status} = 'in_behandeling') as integer)`,
        afgerond: sql<number>`cast(count(*) filter (where ${inspectionsTable.status} = 'afgerond') as integer)`,
        goedgekeurd: sql<number>`cast(count(*) filter (where ${inspectionsTable.readinessStatus} = 'goedgekeurd') as integer)`,
        recent: sql<number>`cast(count(*) filter (where ${inspectionsTable.createdAt} >= ${sevenDaysAgo}::timestamp) as integer)`,
      })
      .from(inspectionsTable);
    
    let inspectionStats;
    if (!userIsAdmin && userOrgIds.length > 0) {
      inspectionStats = await inspectionsQuery.where(
        or(
          inArray(inspectionsTable.organizationId, userOrgIds),
          isNull(inspectionsTable.organizationId)
        )
      );
    } else if (!userIsAdmin) {
      inspectionStats = await inspectionsQuery.where(isNull(inspectionsTable.organizationId));
    } else {
      inspectionStats = await inspectionsQuery;
    }
    inspectionStatsData = inspectionStats[0] || { total: 0, open: 0, in_behandeling: 0, afgerond: 0, goedgekeurd: 0, recent: 0 };
  } catch (error) {
    // Tabel bestaat nog niet - gebruik lege statistieken
    console.warn("Inspections table not found, using empty stats:", error);
    inspectionStatsData = { total: 0, open: 0, in_behandeling: 0, afgerond: 0, goedgekeurd: 0, recent: 0 };
  }

  // Haal toezicht statistieken op (met error handling voor als de tabel nog niet bestaat)
  let supervisionStatsData = { total: 0, open: 0, in_behandeling: 0, afgerond: 0, excellent: 0, recent: 0 };
  try {
    const supervisionsQuery = db
      .select({
        total: sql<number>`cast(count(*) as integer)`,
        open: sql<number>`cast(count(*) filter (where ${supervisionsTable.status} = 'open') as integer)`,
        in_behandeling: sql<number>`cast(count(*) filter (where ${supervisionsTable.status} = 'in_behandeling') as integer)`,
        afgerond: sql<number>`cast(count(*) filter (where ${supervisionsTable.status} = 'afgerond') as integer)`,
        excellent: sql<number>`cast(count(*) filter (where ${supervisionsTable.overallQuality} = 'excellent') as integer)`,
        recent: sql<number>`cast(count(*) filter (where ${supervisionsTable.createdAt} >= ${sevenDaysAgo}::timestamp) as integer)`,
      })
      .from(supervisionsTable);
    
    let supervisionStats;
    if (!userIsAdmin && userOrgIds.length > 0) {
      supervisionStats = await supervisionsQuery.where(
        or(
          inArray(supervisionsTable.organizationId, userOrgIds),
          isNull(supervisionsTable.organizationId)
        )
      );
    } else if (!userIsAdmin) {
      supervisionStats = await supervisionsQuery.where(isNull(supervisionsTable.organizationId));
    } else {
      supervisionStats = await supervisionsQuery;
    }
    supervisionStatsData = supervisionStats[0] || { total: 0, open: 0, in_behandeling: 0, afgerond: 0, excellent: 0, recent: 0 };
  } catch (error) {
    // Tabel bestaat nog niet - gebruik lege statistieken
    console.warn("Supervisions table not found, using empty stats:", error);
    supervisionStatsData = { total: 0, open: 0, in_behandeling: 0, afgerond: 0, excellent: 0, recent: 0 };
  }

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

          <div className="space-y-6">
            {/* Projecten tegel - overkoepelend */}
            <Link href="/dashboard/projects" className="block rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-chart-3/10 text-chart-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-card-foreground">Projecten</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Beheer je projecten en voeg nieuwe toe
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground mb-1">Totaal</span>
                  <span className="text-2xl font-semibold text-card-foreground">{projectStatsData.total}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground mb-1">Actief</span>
                  <span className="text-2xl font-semibold text-chart-3">{projectStatsData.active}</span>
                </div>
                {projectStatsData.onHold > 0 && (
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1">Op hold</span>
                    <span className="text-2xl font-semibold text-muted-foreground">{projectStatsData.onHold}</span>
                  </div>
                )}
                {projectStatsData.completed > 0 && (
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1">Voltooid</span>
                    <span className="text-2xl font-semibold text-muted-foreground">{projectStatsData.completed}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-xs text-primary group-hover:text-primary/80 transition-colors font-medium">
                  Bekijk alle projecten →
                </span>
              </div>
            </Link>

            {/* Module tegels - 3 kolommen */}
            <div className="grid gap-6 md:grid-cols-3">
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

              <Link href="/dashboard/ai-schouw" className="rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg text-card-foreground">AI Schouwen</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 min-h-[2.5rem]">
                  Beheer schouwen voor aansluitleidingen
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Totaal</span>
                    <span className="text-lg font-semibold text-card-foreground">{inspectionStatsData.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Open</span>
                    <span className="text-sm font-medium text-primary">{inspectionStatsData.open}</span>
                  </div>
                  {inspectionStatsData.in_behandeling > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">In Behandeling</span>
                      <span className="text-sm font-medium text-yellow-500">{inspectionStatsData.in_behandeling}</span>
                    </div>
                  )}
                  {inspectionStatsData.afgerond > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Afgerond</span>
                      <span className="text-sm font-medium text-green-500">{inspectionStatsData.afgerond}</span>
                    </div>
                  )}
                  {inspectionStatsData.goedgekeurd > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Goedgekeurd</span>
                      <span className="text-sm font-medium text-green-600">{inspectionStatsData.goedgekeurd}</span>
                    </div>
                  )}
                  {inspectionStatsData.recent > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Laatste 7 dagen</span>
                      <span className="text-sm font-medium text-card-foreground">{inspectionStatsData.recent}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-primary group-hover:text-primary/80 transition-colors font-medium">
                    Bekijk alle schouwen →
                  </span>
                </div>
              </Link>

              <Link href="/dashboard/ai-toezicht" className="rounded-lg border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-chart-2/10 text-chart-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg text-card-foreground">AI Toezicht</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 min-h-[2.5rem]">
                  Kwaliteitscontrole en toezicht op projecten
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Totaal</span>
                    <span className="text-lg font-semibold text-card-foreground">{supervisionStatsData.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Open</span>
                    <span className="text-sm font-medium text-primary">{supervisionStatsData.open}</span>
                  </div>
                  {supervisionStatsData.in_behandeling > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">In Behandeling</span>
                      <span className="text-sm font-medium text-yellow-500">{supervisionStatsData.in_behandeling}</span>
                    </div>
                  )}
                  {supervisionStatsData.afgerond > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Afgerond</span>
                      <span className="text-sm font-medium text-green-500">{supervisionStatsData.afgerond}</span>
                    </div>
                  )}
                  {supervisionStatsData.excellent > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Excellent</span>
                      <span className="text-sm font-medium text-green-600">{supervisionStatsData.excellent}</span>
                    </div>
                  )}
                  {supervisionStatsData.recent > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Laatste 7 dagen</span>
                      <span className="text-sm font-medium text-card-foreground">{supervisionStatsData.recent}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-primary group-hover:text-primary/80 transition-colors font-medium">
                    Bekijk alle toezichten →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

