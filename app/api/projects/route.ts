import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectsTable, safetyIncidentsTable, organizationsTable, inspectionsTable, supervisionsTable } from "@/lib/db/schema";
import { getUserOrganizationIds, isAdmin } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq, desc, sql, and, inArray, or, isNull } from "drizzle-orm";

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
      projectId,
      name,
      description,
      projectManager,
      organizationId,
      category,
      discipline,
      startDate,
      endDate,
      budget,
      status,
    } = body;

    // Validatie
    if (!projectId || !name) {
      return NextResponse.json(
        { error: "Project ID en naam zijn verplicht" },
        { status: 400 }
      );
    }

    // Budget omzetten naar centen als het is ingevuld
    const budgetInCents = budget ? Math.round(parseFloat(budget) * 100) : null;

    // Project aanmaken
    const newProject = await db.insert(projectsTable).values({
      projectId,
      name,
      description: description || null,
      projectManager: projectManager || null,
      organizationId: organizationId || null,
      category: category || null,
      discipline: discipline || null,
      startDate: startDate ? new Date(startDate) : null,
      plannedEndDate: endDate ? new Date(endDate) : null,
      budget: budgetInCents,
      status: status || "active",
      ownerId: userId,
    }).returning();

    return NextResponse.json(newProject[0], { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van het project" },
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

    // Check of gebruiker admin is
    const userIsAdmin = await isAdmin();
    
    // Haal organisatie IDs op voor filtering (leeg voor admins)
    const userOrgIds = await getUserOrganizationIds(userId);

    // Paginatie parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build optimized query met JOINs in plaats van subqueries
    const baseQuery = db
      .select({
        id: projectsTable.id,
        projectId: projectsTable.projectId,
        name: projectsTable.name,
        description: projectsTable.description,
        status: projectsTable.status,
        plaats: projectsTable.plaats,
        gemeente: projectsTable.gemeente,
        coordinates: projectsTable.coordinates,
        category: projectsTable.category,
        discipline: projectsTable.discipline,
        projectManager: projectsTable.projectManager,
        projectManagerId: projectsTable.projectManagerId,
        organizationId: projectsTable.organizationId,
        organization: organizationsTable.name,
        startDate: projectsTable.startDate,
        endDate: projectsTable.endDate,
        plannedEndDate: projectsTable.plannedEndDate,
        budget: projectsTable.budget,
        currency: projectsTable.currency,
        ownerId: projectsTable.ownerId,
        createdAt: projectsTable.createdAt,
        updatedAt: projectsTable.updatedAt,
        // Gebruik COUNT met DISTINCT in plaats van subqueries
        safetyIncidentCount: sql<number>`COALESCE(COUNT(DISTINCT ${safetyIncidentsTable.id}), 0)`.as('safetyIncidentCount'),
        inspectionCount: sql<number>`COALESCE(COUNT(DISTINCT ${inspectionsTable.id}), 0)`.as('inspectionCount'),
        supervisionCount: sql<number>`COALESCE(COUNT(DISTINCT ${supervisionsTable.id}), 0)`.as('supervisionCount'),
      })
      .from(projectsTable)
      .leftJoin(organizationsTable, eq(projectsTable.organizationId, organizationsTable.id))
      .leftJoin(safetyIncidentsTable, eq(projectsTable.id, safetyIncidentsTable.projectId))
      .leftJoin(inspectionsTable, eq(projectsTable.id, inspectionsTable.projectId))
      .leftJoin(supervisionsTable, eq(projectsTable.id, supervisionsTable.projectId))
      .groupBy(projectsTable.id, organizationsTable.id);

    // Filter op organisatie als gebruiker geen admin is
    let filteredQuery;
    
    if (userIsAdmin) {
      // Admin: toon alles (geen filtering)
      filteredQuery = baseQuery;
    } else if (userOrgIds.length > 0) {
      // Gebruiker heeft organisaties: filter op organisaties + items zonder organisatie
      filteredQuery = baseQuery.where(
        or(
          inArray(projectsTable.organizationId, userOrgIds),
          isNull(projectsTable.organizationId) // Toon ook projecten zonder organisatie
        )
      );
    } else {
      // Gebruiker heeft geen organisaties en is geen admin: toon alleen items zonder organisatie
      filteredQuery = baseQuery.where(isNull(projectsTable.organizationId));
    }

    // Haal totaal aantal op voor paginatie metadata
    let totalCountQuery;
    if (!userIsAdmin && userOrgIds.length > 0) {
      totalCountQuery = db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(projectsTable)
        .where(
          or(
            inArray(projectsTable.organizationId, userOrgIds),
            isNull(projectsTable.organizationId)
          )
        );
    } else if (!userIsAdmin) {
      totalCountQuery = db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(projectsTable)
        .where(isNull(projectsTable.organizationId));
    } else {
      totalCountQuery = db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(projectsTable);
    }

    const totalResult = await totalCountQuery;
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Voeg paginatie en sortering toe
    const projects = await filteredQuery
      .orderBy(desc(projectsTable.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van projecten" },
      { status: 500 }
    );
  }
}

