import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable, aiAnalysesTable } from "@/lib/db/schema";
import { suggestActionsFromAnalysis, analyzeSafetyIncidents } from "@/lib/services/openai";
import { eq } from "drizzle-orm";

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

    const body = await req.json();
    const { analysisId } = body;

    // Haal incident op
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

    const incidentData = incident[0];

    // Haal analyse op als analysisId is meegegeven
    let analysis = null;
    if (analysisId) {
      const analyses = await db
        .select()
        .from(aiAnalysesTable)
        .where(eq(aiAnalysesTable.id, analysisId))
        .limit(1);

      if (analyses.length > 0) {
        const analysisData = analyses[0];
        analysis = {
          summary: analysisData.summary,
          recommendations: JSON.parse(analysisData.recommendations),
          suggestedToolboxTopics: JSON.parse(analysisData.suggestedToolboxTopics),
          riskAssessment: analysisData.riskAssessment ?? "",
          preventiveMeasures: analysisData.preventiveMeasures ? JSON.parse(analysisData.preventiveMeasures) : [],
        };
      }
    }

    // Als er geen analyse is, genereer er eerst een
    if (!analysis) {
      const analysisResult = await analyzeSafetyIncidents([{
        incidentId: incidentData.incidentId,
        title: incidentData.title,
        description: incidentData.description,
        category: incidentData.category,
        severity: incidentData.severity,
        discipline: incidentData.discipline || null,
        location: incidentData.location || null,
        impact: incidentData.impact || null,
        mitigation: incidentData.mitigation || null,
        affectedSystems: incidentData.affectedSystems || null,
        safetyMeasures: incidentData.safetyMeasures || null,
        riskAssessment: incidentData.riskAssessment || null,
      }]);
      analysis = analysisResult;
    }

    if (!analysis) {
      return NextResponse.json(
        { error: "Kon geen analyse genereren of ophalen" },
        { status: 500 }
      );
    }

    // Genereer acties op basis van de analyse
    const suggestedActions = await suggestActionsFromAnalysis(
      analysis,
      {
        incidentId: incidentData.incidentId || '',
        title: incidentData.title || '',
        description: incidentData.description || '',
        category: incidentData.category || '',
        severity: incidentData.severity || 'medium',
        discipline: incidentData.discipline || null,
        location: incidentData.location || null,
        impact: incidentData.impact || null,
        mitigation: incidentData.mitigation || null,
        affectedSystems: incidentData.affectedSystems || null,
        safetyMeasures: incidentData.safetyMeasures || null,
        riskAssessment: incidentData.riskAssessment || null,
      }
    );

    return NextResponse.json({
      success: true,
      actions: suggestedActions,
    });
  } catch (error) {
    console.error("Error generating actions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het genereren van acties" },
      { status: 500 }
    );
  }
}

