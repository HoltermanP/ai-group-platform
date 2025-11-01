import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectsTable } from "@/lib/db/schema";
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
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Ongeldig project ID" },
        { status: 400 }
      );
    }

    // DEMO MODE: Haal alle projecten op (inclusief testdata)
    // Voor productie: uncomment de ownerId check in de where clause
    const projects = await db
      .select()
      .from(projectsTable)
      .where(
        eq(projectsTable.id, projectId)
        // and(
        //   eq(projectsTable.id, projectId),
        //   eq(projectsTable.ownerId, userId)
        // )
      )
      .limit(1);

    if (projects.length === 0) {
      return NextResponse.json(
        { error: "Project niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(projects[0]);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van het project" },
      { status: 500 }
    );
  }
}

