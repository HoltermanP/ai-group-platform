import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiAnalysesTable } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      incidentIds, 
      summary, 
      recommendations, 
      suggestedToolboxTopics, 
      riskAssessment, 
      preventiveMeasures,
      tokensUsed 
    } = body;

    if (!incidentIds || !Array.isArray(incidentIds) || incidentIds.length === 0) {
      return NextResponse.json(
        { error: "Minimaal één incident ID is vereist" },
        { status: 400 }
      );
    }

    if (!summary || !recommendations || !suggestedToolboxTopics || !preventiveMeasures) {
      return NextResponse.json(
        { error: "Alle analyse velden zijn vereist" },
        { status: 400 }
      );
    }

    // Sla analyse definitief op
    const analysisId = `AI-${Date.now()}-${nanoid(6)}`;
    const savedAnalysis = await db.insert(aiAnalysesTable).values({
      analysisId,
      incidentIds: JSON.stringify(incidentIds),
      summary,
      recommendations: JSON.stringify(recommendations),
      suggestedToolboxTopics: JSON.stringify(suggestedToolboxTopics),
      riskAssessment: riskAssessment || null,
      preventiveMeasures: JSON.stringify(preventiveMeasures),
      model: 'gpt-4',
      tokensUsed: tokensUsed || null,
      createdBy: userId,
    }).returning();

    return NextResponse.json({
      success: true,
      analysis: savedAnalysis[0],
    });
  } catch (error) {
    console.error("Error saving AI analysis:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan van de analyse" },
      { status: 500 }
    );
  }
}

