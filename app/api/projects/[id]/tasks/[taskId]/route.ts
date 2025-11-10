import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectTasksTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

// PUT - Update een taak
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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
    const taskId = parseInt(resolvedParams.taskId);
    
    if (isNaN(projectId) || isNaN(taskId)) {
      return NextResponse.json(
        { error: "Ongeldig project of taak ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
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

    // Update taak
    const updatedTask = await db
      .update(projectTasksTable)
      .set({
        title,
        description,
        status,
        priority,
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        plannedDuration: plannedDuration ? parseInt(plannedDuration) : null,
        dependencies: dependencies ? JSON.stringify(dependencies) : null,
        assignedTo,
        assignedToName,
        progress,
        completedAt: status === "completed" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectTasksTable.id, taskId),
          eq(projectTasksTable.projectId, projectId)
        )
      )
      .returning();

    if (updatedTask.length === 0) {
      return NextResponse.json(
        { error: "Taak niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTask[0]);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het bijwerken van de taak" },
      { status: 500 }
    );
  }
}

// DELETE - Verwijder een taak
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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
    const taskId = parseInt(resolvedParams.taskId);
    
    if (isNaN(projectId) || isNaN(taskId)) {
      return NextResponse.json(
        { error: "Ongeldig project of taak ID" },
        { status: 400 }
      );
    }

    // Verwijder taak
    const deletedTask = await db
      .delete(projectTasksTable)
      .where(
        and(
          eq(projectTasksTable.id, taskId),
          eq(projectTasksTable.projectId, projectId)
        )
      )
      .returning();

    if (deletedTask.length === 0) {
      return NextResponse.json(
        { error: "Taak niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Taak verwijderd" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het verwijderen van de taak" },
      { status: 500 }
    );
  }
}

