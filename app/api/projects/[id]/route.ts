import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectsTable } from "@/lib/db/schema";
import { getUserOrganizationIds, canAccessOrganizationResource } from "@/lib/clerk-admin";
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

    // Haal project op
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (projects.length === 0) {
      return NextResponse.json(
        { error: "Project niet gevonden" },
        { status: 404 }
      );
    }

    const project = projects[0];

    // Check organisatie toegang als gebruiker geen admin is
    if (project.organizationId) {
      const userOrgIds = await getUserOrganizationIds(userId);
      if (userOrgIds.length > 0 && !userOrgIds.includes(project.organizationId)) {
        return NextResponse.json(
          { error: "Geen toegang tot dit project" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van het project" },
      { status: 500 }
    );
  }
}

