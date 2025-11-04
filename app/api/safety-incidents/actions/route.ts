import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { incidentActionsTable, safetyIncidentsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, and, or, inArray, isNull } from "drizzle-orm";
import { getUserOrganizationIds, isAdmin } from "@/lib/clerk-admin";

// GET - Haal alle acties op met filters en joins naar incidenten
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    
    // Filters uit query parameters
    const incidentStatus = searchParams.get('incidentStatus'); // open, investigating, resolved, closed
    const actionStatus = searchParams.get('actionStatus'); // suggested, approved, in_progress, completed, cancelled
    const actionPriority = searchParams.get('actionPriority'); // low, medium, high, urgent
    const includeResolved = searchParams.get('includeResolved') === 'true'; // Include resolved incidents
    const projectId = searchParams.get('projectId');

    // Haal organisatie rechten op voor filtering
    const userIsAdmin = await isAdmin();
    const userOrgIds = await getUserOrganizationIds(userId);

    // Build where conditions
    const conditions = [];

    // Filter op incident status
    if (incidentStatus) {
      conditions.push(eq(safetyIncidentsTable.status, incidentStatus));
    } else if (!includeResolved) {
      // Standaard: alleen niet-afgehandelde incidenten (open of investigating)
      conditions.push(
        or(
          eq(safetyIncidentsTable.status, 'open'),
          eq(safetyIncidentsTable.status, 'investigating')
        )
      );
    }

    // Filter op actie status
    if (actionStatus) {
      conditions.push(eq(incidentActionsTable.status, actionStatus));
    }

    // Filter op actie prioriteit
    if (actionPriority) {
      conditions.push(eq(incidentActionsTable.priority, actionPriority));
    }

    // Filter op project
    if (projectId) {
      conditions.push(eq(safetyIncidentsTable.projectId, parseInt(projectId)));
    }

    // Organisatie filtering (niet-admin)
    if (!userIsAdmin) {
      if (userOrgIds.length > 0) {
        conditions.push(
          or(
            inArray(safetyIncidentsTable.organizationId, userOrgIds),
            isNull(safetyIncidentsTable.organizationId)
          )
        );
      } else {
        conditions.push(isNull(safetyIncidentsTable.organizationId));
      }
    }

    // Basis query met join naar incident en where clause
    const baseQuery = db
      .select({
        // Actie velden
        id: incidentActionsTable.id,
        actionId: incidentActionsTable.actionId,
        incidentId: incidentActionsTable.incidentId,
        analysisId: incidentActionsTable.analysisId,
        title: incidentActionsTable.title,
        description: incidentActionsTable.description,
        priority: incidentActionsTable.priority,
        status: incidentActionsTable.status,
        actionHolder: incidentActionsTable.actionHolder,
        actionHolderEmail: incidentActionsTable.actionHolderEmail,
        deadline: incidentActionsTable.deadline,
        aiSuggested: incidentActionsTable.aiSuggested,
        originalSuggestion: incidentActionsTable.originalSuggestion,
        approvedBy: incidentActionsTable.approvedBy,
        approvedAt: incidentActionsTable.approvedAt,
        createdBy: incidentActionsTable.createdBy,
        createdAt: incidentActionsTable.createdAt,
        updatedAt: incidentActionsTable.updatedAt,
        completedAt: incidentActionsTable.completedAt,
        // Incident velden
        incidentTitle: safetyIncidentsTable.title,
        incidentIdString: safetyIncidentsTable.incidentId,
        incidentStatus: safetyIncidentsTable.status,
        incidentSeverity: safetyIncidentsTable.severity,
        incidentCategory: safetyIncidentsTable.category,
        incidentLocation: safetyIncidentsTable.location,
        incidentProjectId: safetyIncidentsTable.projectId,
        incidentResolvedDate: safetyIncidentsTable.resolvedDate,
      })
      .from(incidentActionsTable)
      .innerJoin(safetyIncidentsTable, eq(incidentActionsTable.incidentId, safetyIncidentsTable.id));

    // Apply conditions
    const actions = conditions.length > 0
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

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
      // Incident info
      incident: {
        id: action.incidentId,
        incidentId: action.incidentIdString,
        title: action.incidentTitle,
        status: action.incidentStatus,
        severity: action.incidentSeverity,
        category: action.incidentCategory,
        location: action.incidentLocation,
        projectId: action.incidentProjectId,
        resolvedDate: action.incidentResolvedDate,
      },
    }));

    // Sorteer op prioriteit en status
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

