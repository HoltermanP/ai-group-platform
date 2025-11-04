import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { inspectionsTable, projectsTable } from "@/lib/db/schema";
import { getUserOrganizationIds, isAdmin } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { sql, or, isNull, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const userIsAdmin = await isAdmin();
    const userOrgIds = await getUserOrganizationIds(userId);

    // Haal inspections op met organisatie filtering
    let inspections;
    if (userIsAdmin) {
      inspections = await db.select().from(inspectionsTable);
    } else if (userOrgIds.length > 0) {
      inspections = await db
        .select()
        .from(inspectionsTable)
        .where(
          or(
            inArray(inspectionsTable.organizationId, userOrgIds),
            isNull(inspectionsTable.organizationId)
          )
        );
    } else {
      inspections = await db
        .select()
        .from(inspectionsTable)
        .where(isNull(inspectionsTable.organizationId));
    }

    // Bereken verschillende analyses
    const analytics = {
      // Totalen
      totals: {
        total: inspections.length,
        open: inspections.filter(i => i.status === 'open').length,
        in_behandeling: inspections.filter(i => i.status === 'in_behandeling').length,
        afgerond: inspections.filter(i => i.status === 'afgerond').length,
        afgekeurd: inspections.filter(i => i.status === 'afgekeurd').length,
        goedgekeurd: inspections.filter(i => i.readinessStatus === 'goedgekeurd').length,
        readiness_afgekeurd: inspections.filter(i => i.readinessStatus === 'afgekeurd').length,
        readiness_in_beoordeling: inspections.filter(i => i.readinessStatus === 'in_beoordeling').length,
      },

      // Distributie per status
      byStatus: Object.entries(
        inspections.reduce((acc, inspection) => {
          acc[inspection.status || 'onbekend'] = (acc[inspection.status || 'onbekend'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([status, count]) => ({ status, count })),

      // Distributie per readiness status
      byReadinessStatus: Object.entries(
        inspections.reduce((acc, inspection) => {
          const status = inspection.readinessStatus || 'geen_status';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([status, count]) => ({ status, count })),

      // Distributie per connection type
      byConnectionType: (() => {
        const typeMap = new Map<string, number>();
        inspections.forEach(inspection => {
          if (inspection.connectionTypes) {
            try {
              const types = JSON.parse(inspection.connectionTypes) as string[];
              types.forEach(type => {
                typeMap.set(type, (typeMap.get(type) || 0) + 1);
              });
            } catch (e) {
              // Invalid JSON, skip
            }
          }
        });
        return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
      })(),

      // Trend over tijd (per maand)
      monthlyTrend: Object.entries(
        inspections.reduce((acc, inspection) => {
          const date = new Date(inspection.createdAt);
          const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const displayKey = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'short' });
          acc[sortKey] = { sortKey, displayKey, count: (acc[sortKey]?.count || 0) + 1 };
          return acc;
        }, {} as Record<string, { sortKey: string; displayKey: string; count: number }>)
      )
      .map(([, data]) => data)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ displayKey, count }) => ({ month: displayKey, count })),

      // Inspections per project
      byProject: Object.entries(
        inspections.reduce((acc, inspection) => {
          acc[inspection.projectId] = (acc[inspection.projectId] || 0) + 1;
          return acc;
        }, {} as Record<number, number>)
      )
      .map(([projectId, count]) => ({ projectId: parseInt(projectId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),

      // Top locaties
      topLocations: Object.entries(
        inspections.reduce((acc, inspection) => {
          if (inspection.location) {
            acc[inspection.location] = (acc[inspection.location] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count })),

      // Inspections die afgekeurd zijn
      rejectedInspections: inspections
        .filter(i => i.readinessStatus === 'afgekeurd')
        .map(i => ({
          id: i.id,
          inspectionId: i.inspectionId,
          title: i.title,
          projectId: i.projectId,
          status: i.status,
          createdAt: i.createdAt,
          location: i.location,
        })),

      // Inspections zonder inspectionDate
      withoutInspectionDate: inspections.filter(i => !i.inspectionDate).length,

      // Inspections zonder location
      withoutLocation: inspections.filter(i => !i.location).length,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching inspections analytics:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van analytics" },
      { status: 500 }
    );
  }
}

