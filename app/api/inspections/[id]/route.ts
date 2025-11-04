import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { inspectionsTable } from "@/lib/db/schema";
import { getUserOrganizationIds } from "@/lib/clerk-admin";
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
    const inspectionId = parseInt(id);
    
    if (isNaN(inspectionId)) {
      return NextResponse.json(
        { error: "Ongeldig schouw ID" },
        { status: 400 }
      );
    }

    const inspections = await db
      .select()
      .from(inspectionsTable)
      .where(eq(inspectionsTable.id, inspectionId))
      .limit(1);

    if (inspections.length === 0) {
      return NextResponse.json(
        { error: "Schouw niet gevonden" },
        { status: 404 }
      );
    }

    const inspection = inspections[0];

    // Check organisatie toegang
    if (inspection.organizationId) {
      const userOrgIds = await getUserOrganizationIds(userId);
      if (userOrgIds.length > 0 && !userOrgIds.includes(inspection.organizationId)) {
        return NextResponse.json(
          { error: "Geen toegang tot deze schouw" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Error fetching inspection:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de schouw" },
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
    const inspectionId = parseInt(id);
    
    if (isNaN(inspectionId)) {
      return NextResponse.json(
        { error: "Ongeldig schouw ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Check toegang
    const existingInspection = await db
      .select()
      .from(inspectionsTable)
      .where(eq(inspectionsTable.id, inspectionId))
      .limit(1);

    if (existingInspection.length === 0) {
      return NextResponse.json(
        { error: "Schouw niet gevonden" },
        { status: 404 }
      );
    }

    if (existingInspection[0].organizationId) {
      const userOrgIds = await getUserOrganizationIds(userId);
      if (userOrgIds.length > 0 && !userOrgIds.includes(existingInspection[0].organizationId)) {
        return NextResponse.json(
          { error: "Geen toegang tot deze schouw" },
          { status: 403 }
        );
      }
    }
    
    // Update de schouw - zorg dat connectionTypes als JSON string wordt opgeslagen
    const updateData: any = {
      ...body,
      updatedAt: new Date(),
    };
    
    if (body.connectionTypes && Array.isArray(body.connectionTypes)) {
      updateData.connectionTypes = JSON.stringify(body.connectionTypes);
    }
    
    if (body.checklist && Array.isArray(body.checklist)) {
      updateData.checklist = JSON.stringify(body.checklist);
    }
    
    const updatedInspection = await db
      .update(inspectionsTable)
      .set(updateData)
      .where(eq(inspectionsTable.id, inspectionId))
      .returning();

    if (updatedInspection.length === 0) {
      return NextResponse.json(
        { error: "Schouw niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedInspection[0]);
  } catch (error) {
    console.error("Error updating inspection:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de schouw" },
      { status: 500 }
    );
  }
}

