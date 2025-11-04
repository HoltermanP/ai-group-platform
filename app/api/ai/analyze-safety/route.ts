import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable, aiAnalysesTable } from "@/lib/db/schema";
import { analyzeSafetyIncidents } from "@/lib/services/openai";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

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
    })));

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
    console.error("Error analyzing safety incidents:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij de AI analyse" },
      { status: 500 }
    );
  }
}

