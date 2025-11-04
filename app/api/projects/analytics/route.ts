import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { 
  projectsTable, 
  safetyIncidentsTable, 
  organizationsTable,
  inspectionsTable,
  supervisionsTable
} from "@/lib/db/schema";
import { getUserOrganizationIds, isAdmin } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq, sql, and, inArray, or, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    // Check of gebruiker admin is
    const userIsAdmin = await isAdmin();
    
    // Haal organisatie IDs op voor filtering
    const userOrgIds = await getUserOrganizationIds(userId);

    // Debug: check totaal aantal projecten in database
    const allProjectsInDb = await db.select().from(projectsTable);
    console.log(`[Projects Analytics] Total projects in database: ${allProjectsInDb.length}`);
    if (allProjectsInDb.length > 0) {
      const withOrg = allProjectsInDb.filter(p => p.organizationId !== null).length;
      const withoutOrg = allProjectsInDb.filter(p => p.organizationId === null).length;
      console.log(`[Projects Analytics] Projects with org: ${withOrg}, without org: ${withoutOrg}`);
    }

    // Build base query voor projecten
    // Admin: toon alle projecten
    // Lid: toon alleen projecten van eigen organisatie(s)
    // Gebruiker zonder organisaties: toon projecten zonder organisatie (consistent met /api/projects)
    let projects;
    
    if (userIsAdmin) {
      // Admin: toon alles (geen filtering)
      projects = await db.select().from(projectsTable);
      console.log(`[Projects Analytics] Admin: Found ${projects.length} projects (all projects)`);
    } else if (userOrgIds.length > 0) {
      // Lid: toon alleen projecten van eigen organisatie(s)
      projects = await db
        .select()
        .from(projectsTable)
        .where(inArray(projectsTable.organizationId, userOrgIds));
      console.log(`[Projects Analytics] Member: Found ${projects.length} projects for organizations: ${userOrgIds.join(', ')}`);
      
      // Debug: check welke organizationIds er zijn in de database
      if (projects.length === 0 && allProjectsInDb.length > 0) {
        const uniqueOrgIds = [...new Set(allProjectsInDb.map(p => p.organizationId).filter(id => id !== null))];
        console.log(`[Projects Analytics] WARNING: User has orgIds ${userOrgIds.join(', ')}, but projects in DB have orgIds: ${uniqueOrgIds.join(', ')}`);
        console.log(`[Projects Analytics] All orgIds in DB:`, uniqueOrgIds);
        console.log(`[Projects Analytics] User orgIds:`, userOrgIds);
        console.log(`[Projects Analytics] Match check:`, userOrgIds.some(id => uniqueOrgIds.includes(id)));
      }
    } else {
      // Gebruiker heeft geen organisaties: toon projecten zonder organisatie (consistent met normale projecten route)
      projects = await db
        .select()
        .from(projectsTable)
        .where(isNull(projectsTable.organizationId));
      console.log(`[Projects Analytics] User has no organizations: Found ${projects.length} projects without organization`);
      console.log(`[Projects Analytics] User ID: ${userId}, isAdmin: ${userIsAdmin}`);
    }

    // Haal gerelateerde data op
    const projectIds = projects.map(p => p.id);
    
    // Veiligheidsincidenten per project (alleen waar projectId niet null is)
    let incidentsByProject: Array<{ projectId: number | null; count: number; critical: number; high: number }> = [];
    if (projectIds.length > 0) {
      try {
        incidentsByProject = await db
          .select({
            projectId: safetyIncidentsTable.projectId,
            count: sql<number>`cast(count(*) as integer)`,
            critical: sql<number>`cast(count(*) filter (where ${safetyIncidentsTable.severity} = 'critical') as integer)`,
            high: sql<number>`cast(count(*) filter (where ${safetyIncidentsTable.severity} = 'high') as integer)`,
          })
          .from(safetyIncidentsTable)
          .where(
            and(
              inArray(safetyIncidentsTable.projectId, projectIds),
              sql`${safetyIncidentsTable.projectId} IS NOT NULL`
            )
          )
          .groupBy(safetyIncidentsTable.projectId);
      } catch (error) {
        console.error("Error fetching incidents:", error);
        // Continue with empty array
      }
    }

    // Schouwen per project
    let inspectionsByProject: Array<{ projectId: number; count: number; goedgekeurd: number; afgekeurd: number }> = [];
    if (projectIds.length > 0) {
      try {
        inspectionsByProject = await db
          .select({
            projectId: inspectionsTable.projectId,
            count: sql<number>`cast(count(*) as integer)`,
            goedgekeurd: sql<number>`cast(count(*) filter (where ${inspectionsTable.readinessStatus} = 'goedgekeurd') as integer)`,
            afgekeurd: sql<number>`cast(count(*) filter (where ${inspectionsTable.readinessStatus} = 'afgekeurd') as integer)`,
          })
          .from(inspectionsTable)
          .where(inArray(inspectionsTable.projectId, projectIds))
          .groupBy(inspectionsTable.projectId);
      } catch (error) {
        console.error("Error fetching inspections:", error);
      }
    }

    // Toezicht per project
    let supervisionsByProject: Array<{ projectId: number; count: number; excellent: number; goed: number }> = [];
    if (projectIds.length > 0) {
      try {
        supervisionsByProject = await db
          .select({
            projectId: supervisionsTable.projectId,
            count: sql<number>`cast(count(*) as integer)`,
            excellent: sql<number>`cast(count(*) filter (where ${supervisionsTable.overallQuality} = 'excellent') as integer)`,
            goed: sql<number>`cast(count(*) filter (where ${supervisionsTable.overallQuality} = 'goed') as integer)`,
          })
          .from(supervisionsTable)
          .where(inArray(supervisionsTable.projectId, projectIds))
          .groupBy(supervisionsTable.projectId);
      } catch (error) {
        console.error("Error fetching supervisions:", error);
      }
    }

    // Maak lookup maps (filter null projectIds)
    const incidentsMap = new Map(
      incidentsByProject
        .filter(i => i.projectId !== null)
        .map(i => [i.projectId!, i])
    );
    const inspectionsMap = new Map(inspectionsByProject.map(i => [i.projectId, i]));
    const supervisionsMap = new Map(supervisionsByProject.map(s => [s.projectId, s]));

    // Bereken analytics
    const now = new Date();

    // Projects met volledige data
    const projectsWithData = projects.map(project => {
      const incidents = incidentsMap.get(project.id) || { count: 0, critical: 0, high: 0 };
      const inspections = inspectionsMap.get(project.id) || { count: 0, goedgekeurd: 0, afgekeurd: 0 };
      const supervisions = supervisionsMap.get(project.id) || { count: 0, excellent: 0, goed: 0 };
      
      // Bereken vertraging
      let isDelayed = false;
      let daysDelayed = 0;
      if (project.plannedEndDate && project.endDate) {
        const planned = new Date(project.plannedEndDate);
        const actual = new Date(project.endDate);
        if (actual > planned) {
          isDelayed = true;
          daysDelayed = Math.ceil((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
        }
      } else if (project.plannedEndDate && !project.endDate && project.status === 'active') {
        const planned = new Date(project.plannedEndDate);
        if (now > planned) {
          isDelayed = true;
          daysDelayed = Math.ceil((now.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      // Bereken projectduur
      let durationDays = null;
      if (project.startDate && project.endDate) {
        durationDays = Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        ...project,
        incidentsCount: incidents.count,
        criticalIncidents: incidents.critical,
        highIncidents: incidents.high,
        inspectionsCount: inspections.count,
        inspectionsApproved: inspections.goedgekeurd,
        inspectionsRejected: inspections.afgekeurd,
        supervisionsCount: supervisions.count,
        supervisionsExcellent: supervisions.excellent,
        supervisionsGood: supervisions.goed,
        isDelayed,
        daysDelayed,
        durationDays,
      };
    });

    // Totalen
    const totals = {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      onHold: projects.filter(p => p.status === 'on-hold').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length,
      withBudget: projects.filter(p => p.budget !== null).length,
      delayed: projectsWithData.filter(p => p.isDelayed).length,
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalIncidents: projectsWithData.reduce((sum, p) => sum + p.incidentsCount, 0),
      totalInspections: projectsWithData.reduce((sum, p) => sum + p.inspectionsCount, 0),
      totalSupervisions: projectsWithData.reduce((sum, p) => sum + p.supervisionsCount, 0),
    };

    // Per status
    const byStatus = Object.entries(
      projects.reduce((acc, p) => {
        acc[p.status || 'unknown'] = (acc[p.status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count }));

    // Per categorie
    const byCategory = Object.entries(
      projects.reduce((acc, p) => {
        const cat = p.category || 'onbekend';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, count]) => ({ category, count }));

    // Per discipline
    const byDiscipline = Object.entries(
      projects.reduce((acc, p) => {
        const disc = p.discipline || 'onbekend';
        acc[disc] = (acc[disc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([discipline, count]) => ({ discipline, count }));

    // Per organisatie - gebruik try-catch om errors te voorkomen
    let byOrganization = [];
    try {
      let byOrganizationQuery = db
        .select({
          organizationId: projectsTable.organizationId,
          organizationName: organizationsTable.name,
          count: sql<number>`cast(count(*) as integer)`,
          totalBudget: sql<number>`cast(sum(coalesce(${projectsTable.budget}, 0)) as integer)`,
        })
        .from(projectsTable)
        .leftJoin(organizationsTable, eq(projectsTable.organizationId, organizationsTable.id));

      if (!userIsAdmin && userOrgIds.length > 0) {
        // Lid: filter alleen op eigen organisaties
        byOrganizationQuery = byOrganizationQuery.where(
          inArray(projectsTable.organizationId, userOrgIds)
        ) as any;
      }
      // Admin: geen filtering (toon alle organisaties)

      byOrganization = await byOrganizationQuery.groupBy(projectsTable.organizationId, organizationsTable.name);
    } catch (error) {
      console.error("Error fetching byOrganization:", error);
      // Fallback: bereken handmatig van de projects array
      const orgMap = new Map<string, { count: number; totalBudget: number }>();
      
      for (const project of projects) {
        const orgId = project.organizationId;
        const key = orgId ? `org_${orgId}` : 'no_org';
        
        if (!orgMap.has(key)) {
          orgMap.set(key, { count: 0, totalBudget: 0 });
        }
        
        const orgData = orgMap.get(key)!;
        orgData.count++;
        orgData.totalBudget += project.budget || 0;
      }
      
      // Haal organisatie namen op
      const orgIds = [...new Set(projects.map(p => p.organizationId).filter(id => id !== null))];
      const orgs = orgIds.length > 0 
        ? await db.select({ id: organizationsTable.id, name: organizationsTable.name })
            .from(organizationsTable)
            .where(inArray(organizationsTable.id, orgIds as number[]))
        : [];
      
      const orgNameMap = new Map(orgs.map(o => [o.id, o.name]));
      
      byOrganization = Array.from(orgMap.entries()).map(([key, data]) => {
        const orgId = key === 'no_org' ? null : parseInt(key.replace('org_', ''));
        return {
          organizationId: orgId,
          organizationName: orgId ? orgNameMap.get(orgId) || null : null,
          count: data.count,
          totalBudget: data.totalBudget,
        };
      });
    }

    const byOrg = byOrganization.map(org => ({
      organization: org.organizationName || 'Geen organisatie',
      count: org.count,
      totalBudget: org.totalBudget || 0,
    }));

    // Per gemeente
    const byGemeente = Object.entries(
      projects.reduce((acc, p) => {
        const gemeente = p.gemeente || 'onbekend';
        acc[gemeente] = (acc[gemeente] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([gemeente, count]) => ({ gemeente, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Per projectmanager
    const byManager = Object.entries(
      projects.reduce((acc, p) => {
        const manager = p.projectManager || 'onbekend';
        acc[manager] = (acc[manager] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([manager, count]) => ({ manager, count }))
      .sort((a, b) => b.count - a.count);

    // Maandelijkse trend (projecten aangemaakt per maand)
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const count = projects.filter(p => {
        const created = new Date(p.createdAt);
        return created >= monthStart && created <= monthEnd;
      }).length;

      return {
        month: date.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' }),
        count,
      };
    });

    // Budget per categorie
    const budgetByCategory = Object.entries(
      projects.reduce((acc, p) => {
        const cat = p.category || 'onbekend';
        acc[cat] = (acc[cat] || 0) + (p.budget || 0);
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, budget]) => ({ category, budget }));

    // Budget per discipline
    const budgetByDiscipline = Object.entries(
      projects.reduce((acc, p) => {
        const disc = p.discipline || 'onbekend';
        acc[disc] = (acc[disc] || 0) + (p.budget || 0);
        return acc;
      }, {} as Record<string, number>)
    ).map(([discipline, budget]) => ({ discipline, budget }));

    // Projecten met meeste incidenten
    const topIncidentProjects = projectsWithData
      .filter(p => p.incidentsCount > 0)
      .sort((a, b) => b.incidentsCount - a.incidentsCount)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        projectId: p.projectId,
        name: p.name,
        incidentsCount: p.incidentsCount,
        criticalIncidents: p.criticalIncidents,
        location: p.plaats || p.gemeente || 'Onbekend',
      }));

    // Projecten die dreigen te vertragen
    const delayedProjects = projectsWithData
      .filter(p => p.isDelayed && p.status === 'active')
      .sort((a, b) => b.daysDelayed - a.daysDelayed)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        projectId: p.projectId,
        name: p.name,
        daysDelayed: p.daysDelayed,
        plannedEndDate: p.plannedEndDate,
        location: p.plaats || p.gemeente || 'Onbekend',
      }));

    // Gemiddelde projectduur per categorie
    const avgDurationByCategory = Object.entries(
      projectsWithData
        .filter(p => p.durationDays !== null)
        .reduce((acc, p) => {
          const cat = p.category || 'onbekend';
          if (!acc[cat]) {
            acc[cat] = { total: 0, count: 0 };
          }
          acc[cat].total += p.durationDays!;
          acc[cat].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>)
    ).map(([category, data]) => ({
      category,
      avgDays: Math.round(data.total / data.count),
    }));

    // Projecten zonder budget
    const projectsWithoutBudget = projects.filter(p => !p.budget).length;

    // Projecten zonder startdatum
    const projectsWithoutStartDate = projects.filter(p => !p.startDate).length;

    // Projecten zonder einddatum
    const projectsWithoutEndDate = projects.filter(p => !p.plannedEndDate).length;

    // Projecten met kritieke incidenten
    const projectsWithCriticalIncidents = projectsWithData
      .filter(p => p.criticalIncidents > 0)
      .map(p => ({
        id: p.id,
        projectId: p.projectId,
        name: p.name,
        criticalIncidents: p.criticalIncidents,
        highIncidents: p.highIncidents,
        location: p.plaats || p.gemeente || 'Onbekend',
      }));

    // Kwaliteits scores (gebaseerd op toezicht)
    const qualityScores = projectsWithData
      .filter(p => p.supervisionsCount > 0)
      .map(p => ({
        id: p.id,
        projectId: p.projectId,
        name: p.name,
        excellent: p.supervisionsExcellent,
        good: p.supervisionsGood,
        total: p.supervisionsCount,
        score: p.supervisionsCount > 0 
          ? Math.round(((p.supervisionsExcellent + p.supervisionsGood) / p.supervisionsCount) * 100)
          : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Return analytics data with debug info (only in development)
    const analyticsData = {
      totals,
      byStatus: byStatus.length > 0 ? byStatus : [],
      byCategory: byCategory.length > 0 ? byCategory : [],
      byDiscipline: byDiscipline.length > 0 ? byDiscipline : [],
      byOrganization: byOrg.length > 0 ? byOrg : [],
      byGemeente: byGemeente.length > 0 ? byGemeente : [],
      byManager: byManager.length > 0 ? byManager : [],
      monthlyTrend: monthlyTrend.length > 0 ? monthlyTrend : [],
      budgetByCategory: budgetByCategory.length > 0 ? budgetByCategory : [],
      budgetByDiscipline: budgetByDiscipline.length > 0 ? budgetByDiscipline : [],
      topIncidentProjects: topIncidentProjects.length > 0 ? topIncidentProjects : [],
      delayedProjects: delayedProjects.length > 0 ? delayedProjects : [],
      avgDurationByCategory: avgDurationByCategory.length > 0 ? avgDurationByCategory : [],
      projectsWithoutBudget,
      projectsWithoutStartDate,
      projectsWithoutEndDate,
      projectsWithCriticalIncidents: projectsWithCriticalIncidents.length > 0 ? projectsWithCriticalIncidents : [],
      qualityScores: qualityScores.length > 0 ? qualityScores : [],
      // Debug info (always include for troubleshooting)
      _debug: {
        totalProjectsInDb: allProjectsInDb.length,
        projectsWithOrg: allProjectsInDb.filter(p => p.organizationId !== null).length,
        projectsWithoutOrg: allProjectsInDb.filter(p => p.organizationId === null).length,
        userIsAdmin,
        userOrgIds,
        projectsFound: projects.length,
        allOrgIdsInDb: [...new Set(allProjectsInDb.map(p => p.organizationId).filter(id => id !== null))],
        nodeEnv: process.env.NODE_ENV,
      }
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching project analytics:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Return empty analytics structure on error with debug info
    return NextResponse.json({
      totals: {
        total: 0,
        active: 0,
        onHold: 0,
        completed: 0,
        cancelled: 0,
        withBudget: 0,
        delayed: 0,
        totalBudget: 0,
        totalIncidents: 0,
        totalInspections: 0,
        totalSupervisions: 0,
      },
      byStatus: [],
      byCategory: [],
      byDiscipline: [],
      byOrganization: [],
      byGemeente: [],
      byManager: [],
      monthlyTrend: [],
      budgetByCategory: [],
      budgetByDiscipline: [],
      topIncidentProjects: [],
      delayedProjects: [],
      avgDurationByCategory: [],
      projectsWithoutBudget: 0,
      projectsWithoutStartDate: 0,
      projectsWithoutEndDate: 0,
      projectsWithCriticalIncidents: [],
      qualityScores: [],
      _debug: {
        error: true,
        errorMessage,
        errorStack,
      }
    }, { status: 200 }); // Return 200 even on error to show empty state
  }
}

