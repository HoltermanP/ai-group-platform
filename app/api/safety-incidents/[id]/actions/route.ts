import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { incidentActionsTable, safetyIncidentsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET - Haal alle acties op voor een incident
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

    // Haal alle acties op voor dit incident
    const actions = await db
      .select()
      .from(incidentActionsTable)
      .where(eq(incidentActionsTable.incidentId, incidentId));

    // Format voor frontend
    const formattedActions = actions.map(action => ({
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
    }));

    // Sorteer op prioriteit en status (urgent/high eerst, then approved, then suggested)
    formattedActions.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const statusOrder = { in_progress: 0, approved: 1, suggested: 2, completed: 3, cancelled: 4 };
      
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                           (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      
      return (statusOrder[a.status as keyof typeof statusOrder] || 2) - 
             (statusOrder[b.status as keyof typeof statusOrder] || 2);
    });

    return NextResponse.json(formattedActions);
  } catch (error) {
    console.error("Error fetching actions:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de acties" },
      { status: 500 }
    );
  }
}

// POST - Maak nieuwe acties aan (goedkeuren voorgestelde acties)
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

    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json(
        { error: "Ongeldig incident ID" },
        { status: 400 }
      );
    }

    // Verifieer dat incident bestaat
    const incident = await db
      .select()
      .from(safetyIncidentsTable)
      .where(eq(safetyIncidentsTable.id, incidentId))
      .limit(1);

    if (incident.length === 0) {
      return NextResponse.json(
        { error: "Incident niet gevonden" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { actions, analysisId } = body;

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: "Minimaal één actie is vereist" },
        { status: 400 }
      );
    }

    // Valideer en maak acties aan
    const createdActions = [];
    for (const action of actions) {
      if (!action.title || !action.description) {
        return NextResponse.json(
          { error: "Elke actie moet een titel en beschrijving hebben" },
          { status: 400 }
        );
      }

      const actionId = `ACT-${Date.now()}-${nanoid(6)}`;
      const deadline = action.deadline ? new Date(action.deadline) : null;

      const created = await db.insert(incidentActionsTable).values({
        actionId,
        incidentId,
        analysisId: analysisId || null,
        title: action.title,
        description: action.description,
        priority: action.priority || 'medium',
        status: action.status || 'approved', // Als actie wordt goedgekeurd, wordt status 'approved'
        actionHolder: action.actionHolder || null,
        actionHolderEmail: action.actionHolderEmail || null,
        deadline: deadline,
        aiSuggested: action.aiSuggested || false,
        originalSuggestion: action.originalSuggestion || null,
        approvedBy: userId,
        approvedAt: new Date(),
        createdBy: userId,
      }).returning();

      createdActions.push(created[0]);
    }

    return NextResponse.json({
      success: true,
      actions: createdActions.map(action => ({
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
      })),
    });
  } catch (error) {
    console.error("Error creating actions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het aanmaken van de acties" },
      { status: 500 }
    );
  }
}

