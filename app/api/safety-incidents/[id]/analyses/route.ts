import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { aiAnalysesTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

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

    // Haal alle analyses op die dit incident bevatten
    const allAnalyses = await db
      .select()
      .from(aiAnalysesTable);

    // Filter analyses die dit incident bevatten
    const incidentAnalyses = allAnalyses.filter(analysis => {
      try {
        const incidentIds = JSON.parse(analysis.incidentIds);
        return Array.isArray(incidentIds) && incidentIds.includes(incidentId);
      } catch {
        return false;
      }
    });

    // Parse JSON velden en format voor frontend
    const formattedAnalyses = incidentAnalyses.map(analysis => {
      try {
        return {
          id: analysis.id,
          analysisId: analysis.analysisId,
          summary: analysis.summary,
          recommendations: analysis.recommendations ? JSON.parse(analysis.recommendations) : [],
          suggestedToolboxTopics: analysis.suggestedToolboxTopics ? JSON.parse(analysis.suggestedToolboxTopics) : [],
          riskAssessment: analysis.riskAssessment,
          preventiveMeasures: analysis.preventiveMeasures ? JSON.parse(analysis.preventiveMeasures) : [],
          model: analysis.model,
          tokensUsed: analysis.tokensUsed,
          createdAt: analysis.createdAt,
        };
      } catch (error) {
        console.error('Error parsing analysis:', error);
        return null;
      }
    }).filter((analysis): analysis is NonNullable<typeof analysis> => analysis !== null);

    // Sorteer op datum (nieuwste eerst)
    formattedAnalyses.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(formattedAnalyses);
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de analyses" },
      { status: 500 }
    );
  }
}

