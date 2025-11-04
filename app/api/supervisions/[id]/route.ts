import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { supervisionsTable } from "@/lib/db/schema";
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
    const supervisionId = parseInt(id);
    
    if (isNaN(supervisionId)) {
      return NextResponse.json(
        { error: "Ongeldig toezicht ID" },
        { status: 400 }
      );
    }

    const supervisions = await db
      .select()
      .from(supervisionsTable)
      .where(eq(supervisionsTable.id, supervisionId))
      .limit(1);

    if (supervisions.length === 0) {
      return NextResponse.json(
        { error: "Toezicht niet gevonden" },
        { status: 404 }
      );
    }

    const supervision = supervisions[0];

    // Check organisatie toegang
    if (supervision.organizationId) {
      const userOrgIds = await getUserOrganizationIds(userId);
      if (userOrgIds.length > 0 && !userOrgIds.includes(supervision.organizationId)) {
        return NextResponse.json(
          { error: "Geen toegang tot dit toezicht" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(supervision);
  } catch (error) {
    console.error("Error fetching supervision:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van het toezicht" },
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
    const supervisionId = parseInt(id);
    
    if (isNaN(supervisionId)) {
      return NextResponse.json(
        { error: "Ongeldig toezicht ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Check toegang
    const existingSupervision = await db
      .select()
      .from(supervisionsTable)
      .where(eq(supervisionsTable.id, supervisionId))
      .limit(1);

    if (existingSupervision.length === 0) {
      return NextResponse.json(
        { error: "Toezicht niet gevonden" },
        { status: 404 }
      );
    }

    if (existingSupervision[0].organizationId) {
      const userOrgIds = await getUserOrganizationIds(userId);
      if (userOrgIds.length > 0 && !userOrgIds.includes(existingSupervision[0].organizationId)) {
        return NextResponse.json(
          { error: "Geen toegang tot dit toezicht" },
          { status: 403 }
        );
      }
    }
    
    // Update het toezicht - zorg dat qualityStandards als JSON string wordt opgeslagen
    const updateData: any = {
      ...body,
      updatedAt: new Date(),
    };
    
    if (body.qualityStandards && typeof body.qualityStandards === 'object') {
      updateData.qualityStandards = JSON.stringify(body.qualityStandards);
    }
    
    const updatedSupervision = await db
      .update(supervisionsTable)
      .set(updateData)
      .where(eq(supervisionsTable.id, supervisionId))
      .returning();

    if (updatedSupervision.length === 0) {
      return NextResponse.json(
        { error: "Toezicht niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSupervision[0]);
  } catch (error) {
    console.error("Error updating supervision:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van het toezicht" },
      { status: 500 }
    );
  }
}

