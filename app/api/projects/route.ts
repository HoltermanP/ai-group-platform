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

    // Build base query with subqueries for counts
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
        safetyIncidentCount: sql<number>`(
          SELECT cast(count(*) as integer)
          FROM ${safetyIncidentsTable}
          WHERE ${safetyIncidentsTable.projectId} = ${projectsTable.id}
        )`,
        inspectionCount: sql<number>`(
          SELECT cast(count(*) as integer)
          FROM ${inspectionsTable}
          WHERE ${inspectionsTable.projectId} = ${projectsTable.id}
        )`,
        supervisionCount: sql<number>`(
          SELECT cast(count(*) as integer)
          FROM ${supervisionsTable}
          WHERE ${supervisionsTable.projectId} = ${projectsTable.id}
        )`,
      })
      .from(projectsTable)
      .leftJoin(organizationsTable, eq(projectsTable.organizationId, organizationsTable.id));

    // Filter op organisatie als gebruiker geen admin is
    let projects;
    
    if (userIsAdmin) {
      // Admin: toon alles (geen filtering)
      projects = await baseQuery
        .orderBy(desc(projectsTable.createdAt));
    } else if (userOrgIds.length > 0) {
      // Gebruiker heeft organisaties: filter op organisaties + items zonder organisatie
      projects = await baseQuery
        .where(
          or(
            inArray(projectsTable.organizationId, userOrgIds),
            isNull(projectsTable.organizationId) // Toon ook projecten zonder organisatie
          )
        )
        .orderBy(desc(projectsTable.createdAt));
    } else {
      // Gebruiker heeft geen organisaties en is geen admin: toon alleen items zonder organisatie
      projects = await baseQuery
        .where(isNull(projectsTable.organizationId))
        .orderBy(desc(projectsTable.createdAt));
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van projecten" },
      { status: 500 }
    );
  }
}

