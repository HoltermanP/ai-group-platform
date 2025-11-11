import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { certificatesTable } from '@/lib/db/schema';
import { isAdmin } from '@/lib/clerk-admin';
import { eq } from 'drizzle-orm';

/**
 * GET /api/admin/certificates/[id]
 * Haal een specifiek certificaat op
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    // Check admin rechten
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Geen toegang - alleen voor admins' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ongeldig certificaat ID' },
        { status: 400 }
      );
    }

    const [certificate] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, id))
      .limit(1);

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificaat niet gevonden' },
        { status: 404 }
      );
    }

    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen certificaat' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/certificates/[id]
 * Update een certificaat
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    // Check admin rechten
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Geen toegang - alleen voor admins' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ongeldig certificaat ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      discipline,
      expires,
      validityYears,
      status,
    } = body;

    // Check of certificaat bestaat
    const [existing] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Certificaat niet gevonden' },
        { status: 404 }
      );
    }

    // Validatie
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: 'Naam is verplicht' },
        { status: 400 }
      );
    }

    if (discipline !== undefined) {
      const validDisciplines = ['Elektra', 'Gas', 'Water', 'Media', 'Algemeen'];
      if (!validDisciplines.includes(discipline)) {
        return NextResponse.json(
          { error: `Discipline moet een van de volgende zijn: ${validDisciplines.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Als expires true is, moet validityYears ingevuld zijn
    const finalExpires = expires !== undefined ? expires : existing.expires;
    if (finalExpires && (validityYears === undefined ? existing.validityYears : validityYears) === null) {
      return NextResponse.json(
        { error: 'Geldigheidstermijn in jaren is verplicht als certificaat verloopt' },
        { status: 400 }
      );
    }

    // Update certificaat
    const [updated] = await db
      .update(certificatesTable)
      .set({
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        discipline: discipline !== undefined ? discipline : existing.discipline,
        expires: expires !== undefined ? expires : existing.expires,
        validityYears: expires !== undefined 
          ? (expires ? (validityYears !== undefined ? validityYears : existing.validityYears) : null)
          : existing.validityYears,
        status: status !== undefined ? status : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(certificatesTable.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating certificate:', error);
    return NextResponse.json(
      { error: 'Fout bij bijwerken certificaat' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/certificates/[id]
 * Verwijder een certificaat
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      );
    }

    // Check admin rechten
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Geen toegang - alleen voor admins' },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Ongeldig certificaat ID' },
        { status: 400 }
      );
    }

    // Check of certificaat bestaat
    const [existing] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Certificaat niet gevonden' },
        { status: 404 }
      );
    }

    // Verwijder certificaat (cascade verwijdert ook user_certificates)
    await db
      .delete(certificatesTable)
      .where(eq(certificatesTable.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json(
      { error: 'Fout bij verwijderen certificaat' },
      { status: 500 }
    );
  }
}

