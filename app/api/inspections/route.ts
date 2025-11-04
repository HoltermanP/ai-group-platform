import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { inspectionsTable, projectsTable } from "@/lib/db/schema";
import { getUserOrganizationIds } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq, desc, or, isNull, inArray } from "drizzle-orm";

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

    const userOrgIds = await getUserOrganizationIds(userId);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let inspections;

    if (projectId) {
      // Haal schouwen op voor een specifiek project
      let query = db
        .select()
        .from(inspectionsTable)
        .where(eq(inspectionsTable.projectId, parseInt(projectId)));

      // Filter op organisatie als gebruiker geen admin is
      if (userOrgIds.length > 0) {
        const project = await db
          .select({ organizationId: projectsTable.organizationId })
          .from(projectsTable)
          .where(eq(projectsTable.id, parseInt(projectId)))
          .limit(1);

        if (project.length > 0 && project[0].organizationId) {
          if (!userOrgIds.includes(project[0].organizationId)) {
            return NextResponse.json([], { status: 200 });
          }
        }
      }

      inspections = await query.orderBy(desc(inspectionsTable.createdAt));
    } else {
      // Haal alle schouwen op met organisatie filtering
      if (userOrgIds.length > 0) {
        inspections = await db
          .select()
          .from(inspectionsTable)
          .where(
            or(
              inArray(inspectionsTable.organizationId, userOrgIds),
              isNull(inspectionsTable.organizationId)
            )
          )
          .orderBy(desc(inspectionsTable.createdAt));
      } else {
        // Admin: toon alles
        inspections = await db
          .select()
          .from(inspectionsTable)
          .orderBy(desc(inspectionsTable.createdAt));
      }
    }

    return NextResponse.json(inspections);
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van schouwen" },
      { status: 500 }
    );
  }
}

