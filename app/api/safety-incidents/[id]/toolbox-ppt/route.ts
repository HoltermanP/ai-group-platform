import { NextResponse } from "next/server";
import { safeAuth, safeCurrentUser } from '@/lib/auth-wrapper';
import { db } from "@/lib/db";
import { safetyIncidentsTable, aiAnalysesTable, userPreferencesTable, toolboxesTable, incidentActionsTable } from "@/lib/db/schema";
import { createGammaDeck, generateGammaDeckContent } from "@/lib/services/gamma";
import { generateToolboxContent } from "@/lib/services/openai";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await safeAuth();
    
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
    const { topic, description, recommendations, suggestedItems, aiAnalysis } = body;

    if (!topic || !description) {
      return NextResponse.json(
        { error: "Topic en beschrijving zijn vereist" },
        { status: 400 }
      );
    }

    // Haal incident op
    const incidents = await db
      .select()
      .from(safetyIncidentsTable)
      .where(eq(safetyIncidentsTable.id, incidentId))
      .limit(1);

    if (incidents.length === 0) {
      return NextResponse.json(
        { error: "Incident niet gevonden" },
        { status: 404 }
      );
    }

    const incident = incidents[0];

    // VERPLICHT: Haal AI analyse op - toolbox kan alleen gemaakt worden met een bestaande analyse
    let savedAnalysis = null;
    
    // Eerst kijken of er een analyse in de request body zit
    if (aiAnalysis) {
      savedAnalysis = aiAnalysis;
    } else {
      // Anders haal de laatste analyse uit de database
      try {
        const allAnalyses = await db.select().from(aiAnalysesTable);
        
        const incidentAnalyses = allAnalyses.filter(analysis => {
          try {
            const incidentIds = JSON.parse(analysis.incidentIds);
            return Array.isArray(incidentIds) && incidentIds.includes(incidentId);
          } catch {
            return false;
          }
        });

        if (incidentAnalyses.length > 0) {
          const latestAnalysis = incidentAnalyses.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

          savedAnalysis = {
            summary: latestAnalysis.summary,
            recommendations: latestAnalysis.recommendations ? JSON.parse(latestAnalysis.recommendations) : [],
            riskAssessment: latestAnalysis.riskAssessment,
            preventiveMeasures: latestAnalysis.preventiveMeasures ? JSON.parse(latestAnalysis.preventiveMeasures) : [],
            suggestedToolboxTopics: latestAnalysis.suggestedToolboxTopics ? JSON.parse(latestAnalysis.suggestedToolboxTopics) : [],
          };
        }
      } catch (error) {
        console.error('Error fetching saved analysis:', error);
      }
    }

    // CONTROLE: Als er geen analyse is, geef een foutmelding
    if (!savedAnalysis) {
      return NextResponse.json(
        { error: "Er is geen AI analyse beschikbaar voor dit incident. Voer eerst een AI analyse uit voordat je een toolbox kunt aanmaken." },
        { status: 400 }
      );
    }

    // Haal incident actions op voor dit incident
    const incidentActions = await db
      .select()
      .from(incidentActionsTable)
      .where(eq(incidentActionsTable.incidentId, incidentId));

    // Format acties voor gebruik in toolbox
    const formattedActions = incidentActions.map(action => ({
      title: action.title,
      description: action.description,
      priority: action.priority || 'medium',
      status: action.status || 'open',
      actionHolder: action.actionHolder,
      deadline: action.deadline ? action.deadline.toISOString() : null,
    }));

    // Haal user preferences op voor model
    const userPrefs = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.clerkUserId, userId))
      .limit(1);

    const selectedModel = userPrefs.length > 0 && userPrefs[0].defaultAIModel
      ? userPrefs[0].defaultAIModel
      : 'gpt-4o';

    // Genereer toolbox items met AI (gebruik analyse data en acties)
    const toolboxContent = await generateToolboxContent(
      topic,
      description,
      {
        recommendations: recommendations || savedAnalysis?.recommendations || [],
        actions: formattedActions,
      },
      selectedModel
    );

    // Genereer Gamma deck content met AI analyse data en acties
    const gammaContent = generateGammaDeckContent(
      topic,
      description,
      toolboxContent.items,
      {
        title: incident.title,
        category: incident.category || '',
        severity: incident.severity || '',
        description: incident.description || '',
      },
      savedAnalysis,
      formattedActions
    );

    // Maak Gamma deck via API
    let gammaDeck;
    try {
      gammaDeck = await createGammaDeck({
        title: `Toolbox: ${topic}`,
        description: description,
        content: gammaContent,
      });
    } catch (gammaError) {
      console.error("Error creating Gamma deck:", gammaError);
      // Geef een duidelijke foutmelding terug
      const errorMessage = gammaError instanceof Error 
        ? gammaError.message 
        : "Er is een fout opgetreden bij het aanmaken van de Gamma presentatie";
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' 
            ? (gammaError instanceof Error ? gammaError.stack : String(gammaError))
            : undefined
        },
        { status: 500 }
      );
    }

    // Maak toolbox record in database
    const toolboxId = `TB-${Date.now()}-${nanoid(6)}`;
    const newToolbox = await db.insert(toolboxesTable).values({
      toolboxId,
      title: `Toolbox: ${topic}`,
      description: description || null,
      topic,
      category: incident.category || 'veiligheid',
      organizationId: incident.organizationId,
      projectId: incident.projectId,
      aiGenerated: true,
      sourceIncidentIds: JSON.stringify([incidentId]),
      aiAdvice: savedAnalysis ? JSON.stringify(savedAnalysis) : null,
      items: JSON.stringify(toolboxContent.items),
      gammaDeckId: gammaDeck.id,
      gammaDeckUrl: gammaDeck.url,
      incidentId: incidentId,
      createdBy: userId,
    }).returning();

    // Update incident met nieuwe toolbox referentie
    const existingPresentations = incident.toolboxPresentations
      ? JSON.parse(incident.toolboxPresentations)
      : [];

    const newPresentation = {
      id: nanoid(),
      topic,
      toolboxId: newToolbox[0].toolboxId,
      gammaDeckId: gammaDeck.id,
      fileUrl: gammaDeck.url,
      createdAt: new Date().toISOString(),
    };

    existingPresentations.push(newPresentation);

    await db
      .update(safetyIncidentsTable)
      .set({
        toolboxPresentations: JSON.stringify(existingPresentations),
        updatedAt: new Date(),
      })
      .where(eq(safetyIncidentsTable.id, incidentId));

    return NextResponse.json({
      success: true,
      presentation: newPresentation,
      toolbox: newToolbox[0],
      gammaDeckUrl: gammaDeck.url,
      fileUrl: gammaDeck.url,
    });
  } catch (error) {
    console.error("Error generating toolbox presentation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het genereren van de toolbox presentatie" },
      { status: 500 }
    );
  }
}

