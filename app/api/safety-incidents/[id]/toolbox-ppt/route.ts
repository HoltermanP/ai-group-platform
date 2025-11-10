import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable, aiAnalysesTable, userPreferencesTable } from "@/lib/db/schema";
import { generateToolboxPresentation } from "@/lib/services/powerpoint";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

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

    // Haal AI analyses op voor dit incident als die beschikbaar zijn
    let savedAnalysis = null;
    if (!aiAnalysis) {
      try {
        // Haal analyses direct uit de database
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
          };
        }
      } catch (error) {
        console.error('Error fetching saved analysis:', error);
      }
    }

    // Haal user preferences op voor model
    const userPrefs = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.clerkUserId, userId))
      .limit(1);

    const selectedModel = userPrefs.length > 0 && userPrefs[0].defaultAIModel
      ? userPrefs[0].defaultAIModel
      : 'gpt-4';

    // Genereer PowerPoint met alle beschikbare informatie
    const pptBuffer = await generateToolboxPresentation({
      topic,
      description,
      incidentId: incident.incidentId,
      incidentTitle: incident.title,
      recommendations,
      suggestedItems,
      model: selectedModel,
      incident: {
        title: incident.title,
        description: incident.description,
        category: incident.category,
        severity: incident.severity,
        discipline: incident.discipline,
        location: incident.location,
        impact: incident.impact,
        mitigation: incident.mitigation,
        safetyMeasures: incident.safetyMeasures,
        riskAssessment: incident.riskAssessment,
        photos: incident.photos,
      },
      aiAnalysis: aiAnalysis || savedAnalysis,
    });

    // Sla PPT op in public/uploads/toolboxes/
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'toolboxes');
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `toolbox-${incident.incidentId}-${Date.now()}-${nanoid(6)}.pptx`;
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, pptBuffer);

    const fileUrl = `/uploads/toolboxes/${fileName}`;

    // Update incident met nieuwe PPT
    const existingPresentations = incident.toolboxPresentations 
      ? JSON.parse(incident.toolboxPresentations) 
      : [];
    
    const newPresentation = {
      id: nanoid(),
      topic,
      fileName,
      fileUrl,
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
      fileUrl,
    });
  } catch (error) {
    console.error("Error generating toolbox presentation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het genereren van de toolbox presentatie" },
      { status: 500 }
    );
  }
}

