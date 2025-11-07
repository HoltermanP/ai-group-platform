import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { safetyIncidentsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: "Ongeldig incident ID" }, { status: 400 });
    }

    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];
    
    if (files.length === 0) {
      return NextResponse.json({ error: "Geen foto's geüpload" }, { status: 400 });
    }

    // Haal huidige incident op
    const incidents = await db
      .select()
      .from(safetyIncidentsTable)
      .where(eq(safetyIncidentsTable.id, incidentId))
      .limit(1);

    if (incidents.length === 0) {
      return NextResponse.json({ error: "Veiligheidsmelding niet gevonden" }, { status: 404 });
    }

    const currentIncident = incidents[0];
    const currentPhotos: string[] = currentIncident.photos 
      ? JSON.parse(currentIncident.photos) 
      : [];

    // Upload foto's
    const uploadedUrls: string[] = [];
    const uploadDir = join(process.cwd(), "public", "uploads", "safety-incidents");
    
    // Zorg dat de directory bestaat
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    for (const file of files) {
      // Valideer file type (op mobiel kan dit soms leeg zijn)
      // Accepteer bestanden met image/* type OF met een bekende image extensie
      const fileName = file.name || '';
      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/i.test(fileName);
      const hasImageType = file.type && file.type.startsWith("image/");
      
      if (!hasImageType && !hasImageExtension) {
        console.log(`Skipping file: invalid type ${file.type || 'empty'}, name: ${fileName}`);
        continue;
      }

      // Validatie: max 5MB per foto
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.log(`Skipping file: too large ${file.size} bytes`);
        continue;
      }

      if (file.size === 0) {
        console.log(`Skipping file: empty file`);
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Genereer unieke bestandsnaam - handle lege of ontbrekende namen
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const originalName = file.name || `foto-${timestamp}.jpg`;
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${incidentId}-${timestamp}-${randomStr}-${sanitizedName}`;
        const filepath = join(uploadDir, filename);
        
        await writeFile(filepath, buffer);
        const url = `/uploads/safety-incidents/${filename}`;
        uploadedUrls.push(url);
        console.log(`Successfully uploaded: ${filename}`);
      } catch (fileError) {
        console.error(`Error processing file ${file.name || 'unnamed'}:`, fileError);
        continue;
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: "Geen geldige foto's gevonden" }, { status: 400 });
    }

    // Update incident met nieuwe foto URLs
    const updatedPhotos = [...currentPhotos, ...uploadedUrls];
    const updatedIncident = await db
      .update(safetyIncidentsTable)
      .set({
        photos: JSON.stringify(updatedPhotos),
        updatedAt: new Date(),
      })
      .where(eq(safetyIncidentsTable.id, incidentId))
      .returning();

    return NextResponse.json({ 
      photos: updatedPhotos,
      incident: updatedIncident[0] 
    }, { status: 200 });
  } catch (error) {
    console.error("Error uploading photos:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het uploaden van de foto's" },
      { status: 500 }
    );
  }
}

