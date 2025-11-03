import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable, projectsTable } from "@/lib/db/schema";
import { getUserOrganizationIds } from "@/lib/clerk-admin";
import { NextResponse } from "next/server";
import { eq, desc, or, isNull, inArray, and } from "drizzle-orm";

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

    // Haal organisatie IDs op voor filtering (leeg voor admins)
    const userOrgIds = await getUserOrganizationIds(userId);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let incidents;

    if (projectId) {
      // Haal incidents op voor een specifiek project
      let query = db
        .select()
        .from(safetyIncidentsTable)
        .where(eq(safetyIncidentsTable.projectId, parseInt(projectId)));

      // Filter op organisatie als gebruiker geen admin is
      if (userOrgIds.length > 0) {
        // Check of project bij een van de organisaties hoort
        const project = await db
          .select({ organizationId: projectsTable.organizationId })
          .from(projectsTable)
          .where(eq(projectsTable.id, parseInt(projectId)))
          .limit(1);

        if (project.length > 0 && project[0].organizationId) {
          if (!userOrgIds.includes(project[0].organizationId)) {
            // Gebruiker heeft geen toegang tot dit project
            return NextResponse.json([], { status: 200 });
          }
        }
      }

      incidents = await query.orderBy(desc(safetyIncidentsTable.createdAt));
    } else {
      // Haal alle incidents op met organisatie filtering
      if (userOrgIds.length > 0) {
        // Haal alleen incidents van organisaties waar gebruiker lid van is
        incidents = await db
          .select()
          .from(safetyIncidentsTable)
          .where(
            or(
              inArray(safetyIncidentsTable.organizationId, userOrgIds),
              isNull(safetyIncidentsTable.organizationId) // Toon ook incidents zonder organisatie
            )
          )
          .orderBy(desc(safetyIncidentsTable.createdAt));
      } else {
        // Admin: toon alles
        incidents = await db
          .select()
          .from(safetyIncidentsTable)
          .orderBy(desc(safetyIncidentsTable.createdAt));
      }
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

