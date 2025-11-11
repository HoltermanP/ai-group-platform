import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { inspectionsTable, projectsTable } from "@/lib/db/schema";
import { getUserOrganizationIds, isAdmin } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq, desc, or, isNull, inArray } from "drizzle-orm";
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
      inspectionId,
      title,
      description,
      projectId,
      connectionTypes,
      location,
      coordinates,
      inspectionDate,
      assignedTo,
      notes,
    } = body;

    // Validatie
    if (!inspectionId || !title || !projectId) {
      return NextResponse.json(
        { error: "Schouw ID, titel en project zijn verplicht" },
        { status: 400 }
      );
    }

    // Haal project op om organizationId te krijgen
    const project = await db
      .select({ organizationId: projectsTable.organizationId })
      .from(projectsTable)
      .where(eq(projectsTable.id, parseInt(projectId)))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { error: "Project niet gevonden" },
        { status: 404 }
      );
    }

    // Schouw aanmaken
    const newInspection = await db.insert(inspectionsTable).values({
      inspectionId,
      title,
      description: description || null,
      projectId: parseInt(projectId),
      organizationId: project[0].organizationId || null,
      connectionTypes: connectionTypes ? JSON.stringify(connectionTypes) : null,
      status: "open",
      location: location || null,
      coordinates: coordinates || null,
      inspectedBy: userId,
      assignedTo: assignedTo || null,
      inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
      notes: notes || null,
    }).returning();

    return NextResponse.json(newInspection[0], { status: 201 });
  } catch (error) {
    console.error("Error creating inspection:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de schouw" },
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
      const baseQuery = db.select().from(inspectionsTable).where(eq(inspectionsTable.projectId, projectIdNum));
      const countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(inspectionsTable).where(eq(inspectionsTable.projectId, projectIdNum));

      // Haal totaal aantal op
      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Haal gepagineerde data op
      const inspections = await baseQuery
        .orderBy(desc(inspectionsTable.createdAt))
        .limit(limit)
        .offset(offset);

      return NextResponse.json({
        data: inspections,
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
        const whereClause = or(
          inArray(inspectionsTable.organizationId, userOrgIds),
          isNull(inspectionsTable.organizationId)
        );
        const baseQuery = db.select().from(inspectionsTable).where(whereClause);
        const countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(inspectionsTable).where(whereClause);

        // Haal totaal aantal op
        const totalResult = await countQuery;
        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        // Haal gepagineerde data op
        const inspections = await baseQuery
          .orderBy(desc(inspectionsTable.createdAt))
          .limit(limit)
          .offset(offset);

        return NextResponse.json({
          data: inspections,
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
        // Admin of geen org filtering nodig
        const baseQuery = db.select().from(inspectionsTable);
        const countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(inspectionsTable);

        // Haal totaal aantal op
        const totalResult = await countQuery;
        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        // Haal gepagineerde data op
        const inspections = await baseQuery
          .orderBy(desc(inspectionsTable.createdAt))
          .limit(limit)
          .offset(offset);

        return NextResponse.json({
          data: inspections,
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
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van schouwen" },
      { status: 500 }
    );
  }
}

