import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectsTable, projectDocumentsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { PROJECT_DOCUMENT_TYPES, type ProjectDocumentType } from "@/lib/constants/project-documents";
import { desc } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Ongeldig project ID" }, { status: 400 });
    }

    // Check of project bestaat
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (projects.length === 0) {
      return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;
    
    if (!file) {
      return NextResponse.json({ error: "Geen bestand geüpload" }, { status: 400 });
    }

    if (!documentType) {
      return NextResponse.json({ error: "Document type is verplicht" }, { status: 400 });
    }

    // Valideer document type
    const validTypes = PROJECT_DOCUMENT_TYPES.map(dt => dt.value);
    if (!validTypes.includes(documentType as ProjectDocumentType)) {
      return NextResponse.json({ error: "Ongeldig document type" }, { status: 400 });
    }

    // Valideer bestandsgrootte (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Bestand is te groot (max 50MB)" }, { status: 400 });
    }

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Genereer unieke bestandsnaam
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const originalName = file.name || `document-${timestamp}`;
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `projects/${projectId}/${documentType}-${timestamp}-${randomStr}-${sanitizedName}`;
      
      let url: string;
      const useBlobStorage = !!process.env.BLOB_READ_WRITE_TOKEN;
      
      if (useBlobStorage) {
        // Gebruik Vercel Blob Storage
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
        });
        url = blob.url;
      } else {
        // Lokaal filesystem (development)
        const { writeFile, mkdir } = await import("fs/promises");
        const { join } = await import("path");
        const { existsSync } = await import("fs");
        
        const uploadDir = join(process.cwd(), "public", "uploads", "projects", projectId.toString());
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        
        const filepath = join(uploadDir, filename.split('/').pop()!);
        await writeFile(filepath, buffer);
        url = `/uploads/projects/${projectId}/${filename.split('/').pop()!}`;
      }

      // Sla document op in database
      const [document] = await db
        .insert(projectDocumentsTable)
        .values({
          projectId,
          documentType,
          fileName: originalName,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          uploadedBy: userId,
          uploadedAt: new Date(),
        })
        .returning();

      return NextResponse.json({ document }, { status: 200 });
    } catch (fileError) {
      console.error("Error uploading file:", fileError);
      return NextResponse.json(
        { error: "Er is een fout opgetreden bij het uploaden van het bestand" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het uploaden van het document" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Ongeldig project ID" }, { status: 400 });
    }

    // Haal alle documenten op voor dit project
    const documents = await db
      .select()
      .from(projectDocumentsTable)
      .where(eq(projectDocumentsTable.projectId, projectId))
      .orderBy(desc(projectDocumentsTable.uploadedAt));

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de documenten" },
      { status: 500 }
    );
  }
}

