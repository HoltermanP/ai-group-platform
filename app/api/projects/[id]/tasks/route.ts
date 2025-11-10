import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectTasksTable, projectsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

// GET - Haal alle taken op voor een project
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

    const resolvedParams = await params;
    const projectId = parseInt(resolvedParams.id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Ongeldig project ID" },
        { status: 400 }
      );
    }

    // Verifieer dat project bestaat
    const project = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { error: "Project niet gevonden" },
        { status: 404 }
      );
    }

    // Haal alle taken op
    const tasks = await db
      .select()
      .from(projectTasksTable)
      .where(eq(projectTasksTable.projectId, projectId))
      .orderBy(desc(projectTasksTable.startDate));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van taken" },
      { status: 500 }
    );
  }
}

// POST - Maak een nieuwe taak aan
export async function POST(
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

    const resolvedParams = await params;
    const projectId = parseInt(resolvedParams.id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Ongeldig project ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      taskId,
      title,
      description,
      status,
      priority,
      type,
      startDate,
      endDate,
      plannedDuration,
      dependencies,
      assignedTo,
      assignedToName,
      progress,
    } = body;

    // Validatie
    if (!taskId || !title) {
      return NextResponse.json(
        { error: "Task ID en titel zijn verplicht" },
        { status: 400 }
      );
    }

    // Verifieer dat project bestaat
    const project = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { error: "Project niet gevonden" },
        { status: 404 }
      );
    }

    // Maak taak aan
    const newTask = await db
      .insert(projectTasksTable)
      .values({
        taskId,
        projectId,
        title,
        description: description || null,
        status: status || "not_started",
        priority: priority || "medium",
        type: type || "task",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        plannedDuration: plannedDuration ? parseInt(plannedDuration) : null,
        dependencies: dependencies ? JSON.stringify(dependencies) : null,
        assignedTo: assignedTo || null,
        assignedToName: assignedToName || null,
        progress: progress || 0,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json(newTask[0], { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de taak" },
      { status: 500 }
    );
  }
}

