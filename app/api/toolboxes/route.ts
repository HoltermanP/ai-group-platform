import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toolboxesTable } from "@/lib/db/schema";
import { generateToolboxContent } from "@/lib/services/openai";
import { eq, desc } from "drizzle-orm";
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
      title,
      topic,
      description,
      category,
      organizationId,
      projectId,
      aiGenerated,
      sourceIncidentIds,
      aiAdvice,
      generateWithAI,
    } = body;

    if (!title || !topic || !category) {
      return NextResponse.json(
        { error: "Titel, onderwerp en categorie zijn verplicht" },
        { status: 400 }
      );
    }

    let items = [];

    // Als generateWithAI true is, genereer items met AI
    if (generateWithAI) {
      try {
        const generated = await generateToolboxContent(topic, description || '', {
          incidentIds: sourceIncidentIds,
        });
        items = generated.items;
      } catch (error) {
        console.error("Error generating toolbox with AI:", error);
        return NextResponse.json(
          { error: "Fout bij het genereren van toolbox met AI. Zorg ervoor dat OPENAI_API_KEY is ingesteld." },
          { status: 500 }
        );
      }
    } else {
      // Gebruik items uit de body als die zijn meegegeven
      items = body.items || [];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Toolbox moet minimaal één item bevatten" },
        { status: 400 }
      );
    }

    const toolboxId = `TB-${Date.now()}-${nanoid(6)}`;
    const newToolbox = await db.insert(toolboxesTable).values({
      toolboxId,
      title,
      description: description || null,
      topic,
      category,
      organizationId: organizationId ? parseInt(organizationId) : null,
      projectId: projectId ? parseInt(projectId) : null,
      aiGenerated: aiGenerated || false,
      sourceIncidentIds: sourceIncidentIds ? JSON.stringify(sourceIncidentIds) : null,
      aiAdvice: aiAdvice || null,
      items: JSON.stringify(items),
      createdBy: userId,
    }).returning();

    return NextResponse.json(newToolbox[0], { status: 201 });
  } catch (error) {
    console.error("Error creating toolbox:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het aanmaken van de toolbox" },
      { status: 500 }
    );
  }
}

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
    const projectId = searchParams.get("projectId");
    const organizationId = searchParams.get("organizationId");

    let toolboxes;

    if (projectId) {
      toolboxes = await db
        .select()
        .from(toolboxesTable)
        .where(eq(toolboxesTable.projectId, parseInt(projectId)))
        .orderBy(desc(toolboxesTable.createdAt));
    } else if (organizationId) {
      toolboxes = await db
        .select()
        .from(toolboxesTable)
        .where(eq(toolboxesTable.organizationId, parseInt(organizationId)))
        .orderBy(desc(toolboxesTable.createdAt));
    } else {
      toolboxes = await db
        .select()
        .from(toolboxesTable)
        .orderBy(desc(toolboxesTable.createdAt));
    }

    return NextResponse.json(toolboxes);
  } catch (error) {
    console.error("Error fetching toolboxes:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van toolboxen" },
      { status: 500 }
    );
  }
}

