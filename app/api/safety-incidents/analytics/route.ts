import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable } from "@/lib/db/schema";
import { getUserOrganizationIds } from "@/lib/clerk-admin";
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

    // Haal organisatie IDs op voor filtering (leeg voor admins)
    const userOrgIds = await getUserOrganizationIds(userId);

    // Haal incidents op met organisatie filtering
    let incidents;
    if (userOrgIds.length > 0) {
      incidents = await db
        .select()
        .from(safetyIncidentsTable)
        .where(
          or(
            inArray(safetyIncidentsTable.organizationId, userOrgIds),
            isNull(safetyIncidentsTable.organizationId)
          )
        );
    } else {
      // Admin: toon alles
      incidents = await db.select().from(safetyIncidentsTable);
    }

    // Bereken verschillende analyses
    const analytics = {
      // Totalen
      totals: {
        total: incidents.length,
        open: incidents.filter(i => i.status === 'open').length,
        investigating: incidents.filter(i => i.status === 'investigating').length,
        resolved: incidents.filter(i => i.status === 'resolved').length,
        closed: incidents.filter(i => i.status === 'closed').length,
        critical: incidents.filter(i => i.severity === 'critical').length,
        high: incidents.filter(i => i.severity === 'high').length,
      },

      // Distributie per categorie
      byCategory: Object.entries(
        incidents.reduce((acc, incident) => {
          acc[incident.category] = (acc[incident.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([category, count]) => ({ category, count })),

      // Distributie per ernst
      bySeverity: Object.entries(
        incidents.reduce((acc, incident) => {
          acc[incident.severity] = (acc[incident.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([severity, count]) => ({ severity, count })),

      // Distributie per discipline
      byDiscipline: Object.entries(
        incidents.reduce((acc, incident) => {
          const type = incident.discipline || 'onbekend';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, count]) => ({ type, count })),

      // Trend over tijd (per maand)
      monthlyTrend: Object.entries(
        incidents.reduce((acc, incident) => {
          const date = new Date(incident.reportedDate);
          // Gebruik YYYY-MM formaat voor consistente sortering
          const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const displayKey = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'short' });
          acc[sortKey] = { sortKey, displayKey, count: (acc[sortKey]?.count || 0) + 1 };
          return acc;
        }, {} as Record<string, { sortKey: string; displayKey: string; count: number }>)
      )
      .map(([, data]) => data)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ displayKey, count }) => ({ month: displayKey, count })),

      // Ernst per categorie
      severityByCategory: incidents.reduce((acc, incident) => {
        if (!acc[incident.category]) {
          acc[incident.category] = { low: 0, medium: 0, high: 0, critical: 0 };
        }
        acc[incident.category][incident.severity]++;
        return acc;
      }, {} as Record<string, Record<string, number>>),

      // Gemiddelde oplostijd (in dagen)
      avgResolutionTime: (() => {
        const resolved = incidents.filter(i => i.resolvedDate);
        if (resolved.length === 0) return null;
        
        const totalDays = resolved.reduce((sum, incident) => {
          const reported = new Date(incident.reportedDate).getTime();
          const resolved = new Date(incident.resolvedDate!).getTime();
          return sum + (resolved - reported) / (1000 * 60 * 60 * 24);
        }, 0);
        
        return Math.round(totalDays / resolved.length);
      })(),

      // Oplostijd per categorie
      resolutionTimeByCategory: Object.entries(
        incidents
          .filter(i => i.resolvedDate)
          .reduce((acc, incident) => {
            const reported = new Date(incident.reportedDate).getTime();
            const resolved = new Date(incident.resolvedDate!).getTime();
            const days = (resolved - reported) / (1000 * 60 * 60 * 24);
            
            if (!acc[incident.category]) {
              acc[incident.category] = { total: 0, count: 0 };
            }
            acc[incident.category].total += days;
            acc[incident.category].count += 1;
            return acc;
          }, {} as Record<string, { total: number; count: number }>)
      ).map(([category, data]) => ({
        category,
        avgDays: Math.round(data.total / data.count)
      })),

      // Top risico locaties
      topLocations: Object.entries(
        incidents.reduce((acc, incident) => {
          if (incident.location) {
            acc[incident.location] = (acc[incident.location] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count })),

      // Status distributie per maand (laatste 6 maanden)
      statusTrend: (() => {
        const last6Months = new Date();
        last6Months.setMonth(last6Months.getMonth() - 6);
        
        return incidents
          .filter(i => new Date(i.reportedDate) >= last6Months)
          .reduce((acc, incident) => {
            const date = new Date(incident.reportedDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const status = incident.status || 'open';
            
            if (!acc[monthKey]) {
              acc[monthKey] = { month: monthKey, open: 0, investigating: 0, resolved: 0, closed: 0 };
            }
            if (status === 'open' || status === 'investigating' || status === 'resolved' || status === 'closed') {
              acc[monthKey][status]++;
            }
            return acc;
          }, {} as Record<string, any>);
      })(),

      // Kritieke incidents details
      criticalIncidents: incidents
        .filter(i => i.severity === 'critical' && i.status !== 'closed')
        .map(i => ({
          id: i.id,
          incidentId: i.incidentId,
          title: i.title,
          category: i.category,
          status: i.status,
          reportedDate: i.reportedDate,
          location: i.location,
        })),
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van analytics" },
      { status: 500 }
    );
  }
}

