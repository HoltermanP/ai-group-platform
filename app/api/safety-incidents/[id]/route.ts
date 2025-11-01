import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json(
        { error: "Ongeldig incident ID" },
        { status: 400 }
      );
    }

    // Haal het incident op
    const incidents = await db
      .select()
      .from(safetyIncidentsTable)
      .where(eq(safetyIncidentsTable.id, incidentId))
      .limit(1);

    if (incidents.length === 0) {
      return NextResponse.json(
        { error: "Veiligheidsmelding niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(incidents[0]);
  } catch (error) {
    console.error("Error fetching safety incident:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de veiligheidsmelding" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json(
        { error: "Ongeldig incident ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Update het incident
    const updatedIncident = await db
      .update(safetyIncidentsTable)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(safetyIncidentsTable.id, incidentId))
      .returning();

    if (updatedIncident.length === 0) {
      return NextResponse.json(
        { error: "Veiligheidsmelding niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedIncident[0]);
  } catch (error) {
    console.error("Error updating safety incident:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de veiligheidsmelding" },
      { status: 500 }
    );
  }
}

