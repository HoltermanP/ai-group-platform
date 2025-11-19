import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectsTable } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Beschikbare velden voor mapping
export const AVAILABLE_FIELDS = {
  projectId: "Project ID",
  name: "Naam",
  description: "Beschrijving",
  status: "Status",
  plaats: "Plaats",
  gemeente: "Gemeente",
  projectManager: "Project Manager",
  category: "Categorie",
  discipline: "Discipline",
  startDate: "Startdatum",
  endDate: "Einddatum",
  plannedEndDate: "Geplande einddatum",
  budget: "Budget",
  organizationId: "Organisatie ID",
} as const;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mappingJson = formData.get("mapping") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand geüpload" },
        { status: 400 }
      );
    }

    if (!mappingJson) {
      return NextResponse.json(
        { error: "Geen kolom mapping opgegeven" },
        { status: 400 }
      );
    }

    const mapping = JSON.parse(mappingJson);

    // Lees Excel bestand
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (data.length < 2) {
      return NextResponse.json(
        { error: "Excel bestand bevat geen data of alleen headers" },
        { status: 400 }
      );
    }

    // Eerste rij zijn headers
    const headers = data[0] as string[];
    const rows = data.slice(1);

    // Valideer mapping - projectId en name zijn verplicht
    if (!mapping.projectId || !mapping.name) {
      return NextResponse.json(
        { error: "Project ID en Naam zijn verplichte velden" },
        { status: 400 }
      );
    }

    // Valideer dat gemapte kolommen bestaan in Excel
    const mappedColumns = Object.values(mapping).filter(Boolean) as string[];
    const missingColumns = mappedColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `De volgende kolommen ontbreken in het Excel bestand: ${missingColumns.join(", ")}` },
        { status: 400 }
      );
    }

    // Verwerk rijen
    const projectsToInsert: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue; // Skip lege rijen

      try {
        const projectData: Record<string, unknown> = {
          ownerId: userId,
          status: "active", // Default status
        };

        // Map Excel kolommen naar project velden
        for (const [field, excelColumn] of Object.entries(mapping)) {
          if (!excelColumn || typeof excelColumn !== 'string') continue;

          const columnIndex = headers.indexOf(excelColumn);
          if (columnIndex === -1 || columnIndex >= row.length) continue;

          const value = row[columnIndex];
          if (value === null || value === undefined || value === "") continue;

          // Type conversie en validatie
          switch (field) {
            case "projectId":
              projectData.projectId = String(value).trim();
              break;
            case "name":
              projectData.name = String(value).trim();
              break;
            case "description":
              projectData.description = String(value).trim() || null;
              break;
            case "status":
              const statusValue = String(value).trim().toLowerCase();
              const validStatuses = ["active", "on-hold", "completed", "cancelled"];
              projectData.status = validStatuses.includes(statusValue) ? statusValue : "active";
              break;
            case "plaats":
              projectData.plaats = String(value).trim() || null;
              break;
            case "gemeente":
              projectData.gemeente = String(value).trim() || null;
              break;
            case "projectManager":
              projectData.projectManager = String(value).trim() || null;
              break;
            case "category":
              projectData.category = String(value).trim() || null;
              break;
            case "discipline":
              projectData.discipline = String(value).trim() || null;
              break;
            case "startDate":
            case "endDate":
            case "plannedEndDate":
              // Probeer datum te parsen
              const dateValue = parseDate(value);
              if (dateValue) {
                projectData[field] = dateValue;
              }
              break;
            case "budget":
              // Budget kan een getal zijn of een string met euro teken
              const budgetValue = parseBudget(value);
              if (budgetValue !== null) {
                projectData.budget = Math.round(budgetValue * 100); // Converteer naar centen
              }
              break;
            case "organizationId":
              const orgId = parseInt(String(value));
              if (!isNaN(orgId)) {
                projectData.organizationId = orgId;
              }
              break;
          }
        }

        // Validatie
        if (!projectData.projectId || !projectData.name) {
          errors.push(`Rij ${i + 2}: Project ID en Naam zijn verplicht`);
          continue;
        }

        projectsToInsert.push(projectData);
      } catch (error: any) {
        errors.push(`Rij ${i + 2}: ${error.message || "Onbekende fout"}`);
      }
    }

    if (projectsToInsert.length === 0) {
      return NextResponse.json(
        { error: "Geen geldige projecten gevonden om te importeren", errors },
        { status: 400 }
      );
    }

    // Insert projecten (met error handling voor duplicaten)
    const inserted: Array<Record<string, unknown>> = [];
    const skipped: Array<{ projectId: string; reason: string }> = [];

    for (const project of projectsToInsert) {
      try {
        const [newProject] = await db
          .insert(projectsTable)
          .values(project as typeof projectsTable.$inferInsert)
          .returning();
        inserted.push(newProject);
      } catch (error) {
        // Check of het een duplicate key error is
        const errorObj = error as { code?: string; message?: string };
        if (errorObj.code === "23505" || errorObj.message?.includes("unique")) {
          skipped.push({
            projectId: project.projectId as string,
            reason: "Project ID bestaat al",
          });
        } else {
          const errorMessage = errorObj.message || "Onbekende fout";
          errors.push(`Project ${project.projectId}: ${errorMessage}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: inserted.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        inserted: inserted.map((p: Record<string, unknown>) => ({ 
          id: p.id as number, 
          projectId: p.projectId as string, 
          name: p.name as string 
        })),
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error importing projects:", error);
    const errorMessage = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het importeren", details: errorMessage },
      { status: 500 }
    );
  }
}

// Helper functie om datum te parsen
function parseDate(value: unknown): Date | null {
  if (!value) return null;

  // Als het al een Date object is
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Als het een Excel serial date is (getal)
  if (typeof value === "number") {
    // Excel serial date: 1 = 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  // Probeer string te parsen
  const str = String(value).trim();
  if (!str) return null;

  // Probeer verschillende datum formaten
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
  ];

  for (const format of formats) {
    const match = str.match(format);
    if (match) {
      let year, month, day;
      if (format === formats[0] || format === formats[3]) {
        // YYYY-MM-DD of YYYY/MM/DD
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      } else {
        // DD-MM-YYYY of DD/MM/YYYY
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = parseInt(match[3]);
      }
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Laatste poging: native Date parsing
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

// Helper functie om budget te parsen
function parseBudget(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  // Als het al een getal is
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  // Als het een string is, verwijder euro tekens en andere tekens
  const str = String(value)
    .replace(/[€$£]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// GET endpoint om beschikbare velden op te halen
export async function GET() {
  return NextResponse.json({
    fields: AVAILABLE_FIELDS,
  });
}

