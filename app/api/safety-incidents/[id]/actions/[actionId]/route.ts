import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { incidentActionsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

// PUT - Update een actie
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const { id, actionId } = await params;
    const incidentId = parseInt(id);
    const actionIdNum = parseInt(actionId);
    
    if (isNaN(incidentId) || isNaN(actionIdNum)) {
      return NextResponse.json(
        { error: "Ongeldig incident of actie ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Verifieer dat de actie bestaat en bij dit incident hoort
    const existingAction = await db
      .select()
      .from(incidentActionsTable)
      .where(
        and(
          eq(incidentActionsTable.id, actionIdNum),
          eq(incidentActionsTable.incidentId, incidentId)
        )
      )
      .limit(1);

    if (existingAction.length === 0) {
      return NextResponse.json(
        { error: "Actie niet gevonden" },
        { status: 404 }
      );
    }

    // Update velden
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.actionHolder !== undefined) updateData.actionHolder = body.actionHolder;
    if (body.actionHolderEmail !== undefined) updateData.actionHolderEmail = body.actionHolderEmail;
    if (body.deadline !== undefined) {
      updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    }

    // Als status naar 'completed' gaat, zet completedAt
    if (body.status === 'completed' && existingAction[0].status !== 'completed') {
      updateData.completedAt = new Date();
    } else if (body.status !== 'completed' && existingAction[0].status === 'completed') {
      updateData.completedAt = null;
    }

    // Update de actie
    const updated = await db
      .update(incidentActionsTable)
      .set(updateData)
      .where(
        and(
          eq(incidentActionsTable.id, actionIdNum),
          eq(incidentActionsTable.incidentId, incidentId)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Fout bij het updaten van de actie" },
        { status: 500 }
      );
    }

    const action = updated[0];
    return NextResponse.json({
      success: true,
      action: {
        id: action.id,
        actionId: action.actionId,
        incidentId: action.incidentId,
        analysisId: action.analysisId,
        title: action.title,
        description: action.description,
        priority: action.priority,
        status: action.status,
        actionHolder: action.actionHolder,
        actionHolderEmail: action.actionHolderEmail,
        deadline: action.deadline,
        aiSuggested: action.aiSuggested,
        originalSuggestion: action.originalSuggestion,
        approvedBy: action.approvedBy,
        approvedAt: action.approvedAt,
        createdBy: action.createdBy,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
        completedAt: action.completedAt,
      },
    });
  } catch (error) {
    console.error("Error updating action:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het updaten van de actie" },
      { status: 500 }
    );
  }
}

// DELETE - Verwijder een actie
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const { id, actionId } = await params;
    const incidentId = parseInt(id);
    const actionIdNum = parseInt(actionId);
    
    if (isNaN(incidentId) || isNaN(actionIdNum)) {
      return NextResponse.json(
        { error: "Ongeldig incident of actie ID" },
        { status: 400 }
      );
    }

    // Verifieer dat de actie bestaat en bij dit incident hoort
    const existingAction = await db
      .select()
      .from(incidentActionsTable)
      .where(
        and(
          eq(incidentActionsTable.id, actionIdNum),
          eq(incidentActionsTable.incidentId, incidentId)
        )
      )
      .limit(1);

    if (existingAction.length === 0) {
      return NextResponse.json(
        { error: "Actie niet gevonden" },
        { status: 404 }
      );
    }

    // Verwijder de actie
    await db
      .delete(incidentActionsTable)
      .where(
        and(
          eq(incidentActionsTable.id, actionIdNum),
          eq(incidentActionsTable.incidentId, incidentId)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Actie succesvol verwijderd",
    });
  } catch (error) {
    console.error("Error deleting action:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het verwijderen van de actie" },
      { status: 500 }
    );
  }
}

