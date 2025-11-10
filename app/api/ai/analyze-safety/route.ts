import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable, aiAnalysesTable, userPreferencesTable } from "@/lib/db/schema";
import { analyzeSafetyIncidents } from "@/lib/services/openai";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

// Verhoog timeout voor AI analyse (kan lang duren)
export const maxDuration = 120; // 2 minuten

export async function POST(req: Request) {
  try {
    // Check of OpenAI API key is geconfigureerd
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: "OpenAI API key is niet geconfigureerd. Voeg OPENAI_API_KEY toe aan je Vercel environment variables.",
          errorCode: "OPENAI_NOT_CONFIGURED"
        },
        { status: 500 }
      );
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { incidentIds, save = false } = body;

    if (!incidentIds || !Array.isArray(incidentIds) || incidentIds.length === 0) {
      return NextResponse.json(
        { error: "Minimaal één incident ID is vereist" },
        { status: 400 }
      );
    }

    // Haal incidents op
    const incidents = await db
      .select()
      .from(safetyIncidentsTable)
      .where(inArray(safetyIncidentsTable.id, incidentIds.map(id => parseInt(id))));

    if (incidents.length === 0) {
      return NextResponse.json(
        { error: "Geen incidents gevonden" },
        { status: 404 }
      );
    }

    // Haal user preferences op voor custom prompt en model
    const userPrefs = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.clerkUserId, userId))
      .limit(1);

    const customPrompt = userPrefs.length > 0 && userPrefs[0].aiSafetyIncidentPrompt 
      ? userPrefs[0].aiSafetyIncidentPrompt.trim() 
      : undefined;

    const selectedModel = userPrefs.length > 0 && userPrefs[0].defaultAIModel
      ? userPrefs[0].defaultAIModel
      : 'gpt-4';

    // Debug logging
    console.log('=== AI ANALYSIS REQUEST ===');
    console.log('User ID:', userId);
    console.log('Incident count:', incidents.length);
    console.log('Has custom prompt:', !!customPrompt);
    console.log('Custom prompt length:', customPrompt?.length || 0);
    if (customPrompt) {
      console.log('Custom prompt (first 200 chars):', customPrompt.substring(0, 200));
      console.log('Custom prompt (last 200 chars):', customPrompt.substring(Math.max(0, customPrompt.length - 200)));
    } else {
      console.log('No custom prompt found in database');
    }
    console.log('Selected model:', selectedModel);

    // Analyseer met AI
    const analysis = await analyzeSafetyIncidents(incidents.map(inc => ({
      incidentId: inc.incidentId,
      title: inc.title,
      description: inc.description,
      category: inc.category,
      severity: inc.severity,
      discipline: inc.discipline,
      location: inc.location,
      impact: inc.impact,
      mitigation: inc.mitigation,
      affectedSystems: inc.affectedSystems,
      safetyMeasures: inc.safetyMeasures,
      riskAssessment: inc.riskAssessment,
    })), customPrompt || undefined, selectedModel);

    // Valideer dat alle vereiste velden aanwezig zijn
    console.log('=== ANALYSIS RESULT VALIDATION ===');
    console.log('Has summary:', !!analysis.summary, analysis.summary ? `(${analysis.summary.length} chars)` : '');
    console.log('Has recommendations:', !!analysis.recommendations, Array.isArray(analysis.recommendations) ? `(${analysis.recommendations.length} items)` : '');
    console.log('Has suggestedToolboxTopics:', !!analysis.suggestedToolboxTopics, Array.isArray(analysis.suggestedToolboxTopics) ? `(${analysis.suggestedToolboxTopics.length} items)` : '');
    console.log('Has preventiveMeasures:', !!analysis.preventiveMeasures, Array.isArray(analysis.preventiveMeasures) ? `(${analysis.preventiveMeasures.length} items)` : '');
    console.log('Has riskAssessment:', !!analysis.riskAssessment, analysis.riskAssessment ? `(${analysis.riskAssessment.length} chars)` : '');
    
    if (!analysis.summary || !analysis.recommendations || !analysis.suggestedToolboxTopics || !analysis.preventiveMeasures) {
      console.error('=== AI ANALYSIS MISSING REQUIRED FIELDS ===');
      console.error('Full analysis object:', JSON.stringify(analysis, null, 2));
    }

    // Sla analyse alleen op als save=true
    let analysisId = null;
    if (save) {
      analysisId = `AI-${Date.now()}-${nanoid(6)}`;
      await db.insert(aiAnalysesTable).values({
        analysisId,
        incidentIds: JSON.stringify(incidentIds),
        summary: analysis.summary,
        recommendations: JSON.stringify(analysis.recommendations),
        suggestedToolboxTopics: JSON.stringify(analysis.suggestedToolboxTopics),
        riskAssessment: analysis.riskAssessment,
        preventiveMeasures: JSON.stringify(analysis.preventiveMeasures),
        model: 'gpt-4',
        tokensUsed: analysis.tokensUsed || null,
        createdBy: userId,
      });
    }

    return NextResponse.json({
      ...analysis,
      analysisId,
      incidentIds, // Include zodat frontend dit kan gebruiken voor definitieve opslag
    });
  } catch (error) {
    console.error("=== ERROR ANALYZING SAFETY INCIDENTS ===");
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // Geef meer details in development mode
    const errorMessage = error instanceof Error ? error.message : "Er is een fout opgetreden bij de AI analyse";
    const errorDetails = process.env.NODE_ENV === 'development' && error instanceof Error
      ? { details: error.stack, errorType: error.constructor.name }
      : {};
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...errorDetails
      },
      { status: 500 }
    );
  }
}

