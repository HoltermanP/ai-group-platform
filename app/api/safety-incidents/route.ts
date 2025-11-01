import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable, projectsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, desc, or, isNull } from "drizzle-orm";

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
      projectId,
      impact,
      mitigation,
      affectedSystems,
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
      projectId: projectId || null,
      impact: impact || null,
      mitigation: mitigation || null,
      affectedSystems: affectedSystems || null,
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

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let incidents;

    if (projectId) {
      // Haal incidents op voor een specifiek project
      incidents = await db
        .select()
        .from(safetyIncidentsTable)
        .where(eq(safetyIncidentsTable.projectId, parseInt(projectId)))
        .orderBy(desc(safetyIncidentsTable.createdAt));
    } else {
      // Haal alle incidents op (inclusief algemene meldingen)
      incidents = await db
        .select()
        .from(safetyIncidentsTable)
        .orderBy(desc(safetyIncidentsTable.createdAt));
    }

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("Error fetching safety incidents:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van veiligheidsmeldingen" },
      { status: 500 }
    );
  }
}

