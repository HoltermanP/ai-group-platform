import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { supervisionsTable, projectsTable } from "@/lib/db/schema";
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

    // Haal supervisions op met organisatie filtering
    let supervisions;
    if (userIsAdmin) {
      supervisions = await db.select().from(supervisionsTable);
    } else if (userOrgIds.length > 0) {
      supervisions = await db
        .select()
        .from(supervisionsTable)
        .where(
          or(
            inArray(supervisionsTable.organizationId, userOrgIds),
            isNull(supervisionsTable.organizationId)
          )
        );
    } else {
      supervisions = await db
        .select()
        .from(supervisionsTable)
        .where(isNull(supervisionsTable.organizationId));
    }

    // Bereken verschillende analyses
    const analytics = {
      // Totalen
      totals: {
        total: supervisions.length,
        open: supervisions.filter(s => s.status === 'open').length,
        in_behandeling: supervisions.filter(s => s.status === 'in_behandeling').length,
        afgerond: supervisions.filter(s => s.status === 'afgerond').length,
        afgekeurd: supervisions.filter(s => s.status === 'afgekeurd').length,
        excellent: supervisions.filter(s => s.overallQuality === 'excellent').length,
        goed: supervisions.filter(s => s.overallQuality === 'goed').length,
        voldoende: supervisions.filter(s => s.overallQuality === 'voldoende').length,
        onvoldoende: supervisions.filter(s => s.overallQuality === 'onvoldoende').length,
      },

      // Distributie per status
      byStatus: Object.entries(
        supervisions.reduce((acc, supervision) => {
          acc[supervision.status || 'onbekend'] = (acc[supervision.status || 'onbekend'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([status, count]) => ({ status, count })),

      // Distributie per overall quality
      byQuality: Object.entries(
        supervisions.reduce((acc, supervision) => {
          const quality = supervision.overallQuality || 'geen_beoordeling';
          acc[quality] = (acc[quality] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([quality, count]) => ({ quality, count })),

      // Distributie per discipline
      byDiscipline: Object.entries(
        supervisions.reduce((acc, supervision) => {
          const discipline = supervision.discipline || 'onbekend';
          acc[discipline] = (acc[discipline] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([discipline, count]) => ({ discipline, count })),

      // Trend over tijd (per maand)
      monthlyTrend: Object.entries(
        supervisions.reduce((acc, supervision) => {
          const date = new Date(supervision.createdAt);
          const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const displayKey = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'short' });
          acc[sortKey] = { sortKey, displayKey, count: (acc[sortKey]?.count || 0) + 1 };
          return acc;
        }, {} as Record<string, { sortKey: string; displayKey: string; count: number }>)
      )
      .map(([, data]) => data)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ displayKey, count }) => ({ month: displayKey, count })),

      // Supervisions per project
      byProject: Object.entries(
        supervisions.reduce((acc, supervision) => {
          acc[supervision.projectId] = (acc[supervision.projectId] || 0) + 1;
          return acc;
        }, {} as Record<number, number>)
      )
      .map(([projectId, count]) => ({ projectId: parseInt(projectId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),

      // Top locaties
      topLocations: Object.entries(
        supervisions.reduce((acc, supervision) => {
          if (supervision.location) {
            acc[supervision.location] = (acc[supervision.location] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count })),

      // Supervisions met onvoldoende kwaliteit
      insufficientQuality: supervisions
        .filter(s => s.overallQuality === 'onvoldoende')
        .map(s => ({
          id: s.id,
          supervisionId: s.supervisionId,
          title: s.title,
          projectId: s.projectId,
          status: s.status,
          discipline: s.discipline,
          createdAt: s.createdAt,
          location: s.location,
        })),

      // Supervisions zonder supervisionDate
      withoutSupervisionDate: supervisions.filter(s => !s.supervisionDate).length,

      // Supervisions zonder location
      withoutLocation: supervisions.filter(s => !s.location).length,

      // Gemiddelde kwaliteitsscore (als percentage)
      avgQualityScore: (() => {
        const qualityScores: Record<string, number> = {
          excellent: 100,
          goed: 75,
          voldoende: 50,
          onvoldoende: 25,
        };
        
        const scored = supervisions.filter(s => s.overallQuality && qualityScores[s.overallQuality]);
        if (scored.length === 0) return null;
        
        const totalScore = scored.reduce((sum, s) => {
          return sum + (qualityScores[s.overallQuality!] || 0);
        }, 0);
        
        return Math.round(totalScore / scored.length);
      })(),
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching supervisions analytics:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van analytics" },
      { status: 500 }
    );
  }
}

