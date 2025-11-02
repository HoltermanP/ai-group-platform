import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectsTable, safetyIncidentsTable, organizationsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";

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
      infrastructureType,
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
      infrastructureType: infrastructureType || null,
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

    // DEMO MODE: Haal alle projecten op (inclusief testdata) met aantal veiligheidsmeldingen
    // Voor productie: uncomment de where clause hieronder
    const projects = await db
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
        infrastructureType: projectsTable.infrastructureType,
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
        safetyIncidentCount: sql<number>`cast(count(${safetyIncidentsTable.id}) as integer)`,
      })
      .from(projectsTable)
      .leftJoin(organizationsTable, eq(projectsTable.organizationId, organizationsTable.id))
      .leftJoin(safetyIncidentsTable, eq(projectsTable.id, safetyIncidentsTable.projectId))
      // .where(eq(projectsTable.ownerId, userId))
      .groupBy(projectsTable.id, organizationsTable.name)
      .orderBy(desc(projectsTable.createdAt));

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van projecten" },
      { status: 500 }
    );
  }
}

