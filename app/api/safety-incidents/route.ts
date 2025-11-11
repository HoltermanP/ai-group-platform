import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable, projectsTable } from "@/lib/db/schema";
import { getUserOrganizationIds, isAdmin } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq, desc, or, isNull, inArray, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      incidentId,
      title,
      description,
      category,
      severity,
      priority,
      discipline,
      location,
      coordinates,
      depth,
      projectId,
      impact,
      mitigation,
      affectedSystems,
      safetyMeasures,
      riskAssessment,
      contractor,
      assignedTo,
      detectedDate,
      tags,
      externalReference,
    } = body;

    // Validatie
    if (!incidentId || !title || !description || !category || !severity) {
      return NextResponse.json(
        { error: "Incident ID, titel, beschrijving, categorie en ernst zijn verplicht" },
        { status: 400 }
      );
    }

    // Veiligheidsmelding aanmaken
    const newIncident = await db.insert(safetyIncidentsTable).values({
      incidentId,
      title,
      description,
      category,
      severity,
      priority: priority || "medium",
      status: "open",
      discipline: discipline || null,
      location: location || null,
      coordinates: coordinates || null,
      depth: depth || null,
      projectId: projectId || null,
      impact: impact || null,
      mitigation: mitigation || null,
      affectedSystems: affectedSystems || null,
      safetyMeasures: safetyMeasures || null,
      riskAssessment: riskAssessment || null,
      contractor: contractor || null,
      reportedBy: userId,
      assignedTo: assignedTo || null,
      detectedDate: detectedDate ? new Date(detectedDate) : null,
      tags: tags || null,
      externalReference: externalReference || null,
    }).returning();

    return NextResponse.json(newIncident[0], { status: 201 });
  } catch (error) {
    console.error("Error creating safety incident:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de veiligheidsmelding" },
      { status: 500 }
    );
  }
}

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

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    
    // Paginatie parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build queries with conditional where clauses
    if (projectId) {
      const projectIdNum = parseInt(projectId);
      
      // Check toegang tot project
      if (!userIsAdmin && userOrgIds.length > 0) {
        const project = await db
          .select({ organizationId: projectsTable.organizationId })
          .from(projectsTable)
          .where(eq(projectsTable.id, projectIdNum))
          .limit(1);

        if (project.length > 0 && project[0].organizationId) {
          if (!userOrgIds.includes(project[0].organizationId)) {
            return NextResponse.json({
              data: [],
              pagination: {
                page: 1,
                limit,
                total: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            });
          }
        }
      }

      // Build queries with projectId filter
      const baseQuery = db.select().from(safetyIncidentsTable).where(eq(safetyIncidentsTable.projectId, projectIdNum));
      const countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(safetyIncidentsTable).where(eq(safetyIncidentsTable.projectId, projectIdNum));

      // Haal totaal aantal op
      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Haal gepagineerde data op
      const incidents = await baseQuery
        .orderBy(desc(safetyIncidentsTable.createdAt))
        .limit(limit)
        .offset(offset);

      return NextResponse.json({
        data: incidents,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } else {
      // Build queries without projectId filter
      if (!userIsAdmin && userOrgIds.length > 0) {
        // Haal alle incidents op met organisatie filtering
        const whereClause = or(
          inArray(safetyIncidentsTable.organizationId, userOrgIds),
          isNull(safetyIncidentsTable.organizationId)
        );
        const baseQuery = db.select().from(safetyIncidentsTable).where(whereClause);
        const countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(safetyIncidentsTable).where(whereClause);

        // Haal totaal aantal op
        const totalResult = await countQuery;
        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        // Haal gepagineerde data op
        const incidents = await baseQuery
          .orderBy(desc(safetyIncidentsTable.createdAt))
          .limit(limit)
          .offset(offset);

        return NextResponse.json({
          data: incidents,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        });
      } else {
        // Admin: geen extra filtering nodig
        const baseQuery = db.select().from(safetyIncidentsTable);
        const countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(safetyIncidentsTable);

        // Haal totaal aantal op
        const totalResult = await countQuery;
        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        // Haal gepagineerde data op
        const incidents = await baseQuery
          .orderBy(desc(safetyIncidentsTable.createdAt))
          .limit(limit)
          .offset(offset);

        return NextResponse.json({
          data: incidents,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error fetching safety incidents:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van veiligheidsmeldingen" },
      { status: 500 }
    );
  }
}

