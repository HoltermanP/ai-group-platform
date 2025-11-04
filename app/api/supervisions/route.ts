import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { supervisionsTable, projectsTable } from "@/lib/db/schema";
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
      supervisionId,
      title,
      description,
      projectId,
      discipline,
      location,
      coordinates,
      supervisionDate,
      assignedTo,
      notes,
      qualityStandards,
      overallQuality,
    } = body;

    // Validatie
    if (!supervisionId || !title || !projectId) {
      return NextResponse.json(
        { error: "Toezicht ID, titel en project zijn verplicht" },
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

    // Toezicht aanmaken
    const newSupervision = await db.insert(supervisionsTable).values({
      supervisionId,
      title,
      description: description || null,
      projectId: parseInt(projectId),
      organizationId: project[0].organizationId || null,
      discipline: discipline || null,
      status: "open",
      location: location || null,
      coordinates: coordinates || null,
      supervisedBy: userId,
      assignedTo: assignedTo || null,
      supervisionDate: supervisionDate ? new Date(supervisionDate) : null,
      notes: notes || null,
      qualityStandards: qualityStandards ? JSON.stringify(qualityStandards) : null,
      overallQuality: overallQuality || null,
    }).returning();

    return NextResponse.json(newSupervision[0], { status: 201 });
  } catch (error) {
    console.error("Error creating supervision:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van het toezicht" },
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

    let supervisions;

    if (projectId) {
      // Haal toezichten op voor een specifiek project
      let query = db
        .select()
        .from(supervisionsTable)
        .where(eq(supervisionsTable.projectId, parseInt(projectId)));

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

      supervisions = await query.orderBy(desc(supervisionsTable.createdAt));
    } else {
      // Haal alle toezichten op met organisatie filtering
      if (userOrgIds.length > 0) {
        supervisions = await db
          .select()
          .from(supervisionsTable)
          .where(
            or(
              inArray(supervisionsTable.organizationId, userOrgIds),
              isNull(supervisionsTable.organizationId)
            )
          )
          .orderBy(desc(supervisionsTable.createdAt));
      } else {
        // Admin: toon alles
        supervisions = await db
          .select()
          .from(supervisionsTable)
          .orderBy(desc(supervisionsTable.createdAt));
      }
    }

    return NextResponse.json(supervisions);
  } catch (error) {
    console.error("Error fetching supervisions:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van toezichten" },
      { status: 500 }
    );
  }
}

