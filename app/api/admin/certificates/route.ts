import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { certificatesTable } from '@/lib/db/schema';
import { isAdmin } from '@/lib/clerk-admin';
import { desc, eq } from 'drizzle-orm';

/**
 * GET /api/admin/certificates
 * Haal alle certificaten op
 * Alleen toegankelijk voor admins
 */
export async function GET() {
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

    const certificates = await db
      .select()
      .from(certificatesTable)
      .orderBy(desc(certificatesTable.createdAt));

    return NextResponse.json({
      certificates,
      total: certificates.length,
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen certificaten' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/certificates
 * Maak een nieuw certificaat aan
 * Alleen toegankelijk voor admins
 */
export async function POST(req: Request) {
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

    const body = await req.json();
    const {
      name,
      description,
      discipline,
      expires,
      validityYears,
    } = body;

    // Validatie
    if (!name || !discipline) {
      return NextResponse.json(
        { error: 'Naam en discipline zijn verplicht' },
        { status: 400 }
      );
    }

    // Valideer discipline
    const validDisciplines = ['Elektra', 'Gas', 'Water', 'Media', 'Algemeen'];
    if (!validDisciplines.includes(discipline)) {
      return NextResponse.json(
        { error: `Discipline moet een van de volgende zijn: ${validDisciplines.join(', ')}` },
        { status: 400 }
      );
    }

    // Als expires true is, moet validityYears ingevuld zijn
    if (expires && (!validityYears || validityYears <= 0)) {
      return NextResponse.json(
        { error: 'Geldigheidstermijn in jaren is verplicht als certificaat verloopt' },
        { status: 400 }
      );
    }

    // Maak certificaat aan
    const [newCertificate] = await db
      .insert(certificatesTable)
      .values({
        name,
        description: description || null,
        discipline,
        expires: expires || false,
        validityYears: expires ? validityYears : null,
        status: 'active',
        createdBy: userId,
      })
      .returning();

    return NextResponse.json(newCertificate, { status: 201 });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { error: 'Fout bij aanmaken certificaat' },
      { status: 500 }
    );
  }
}

