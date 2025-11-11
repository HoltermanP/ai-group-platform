import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userCertificatesTable, certificatesTable } from '@/lib/db/schema';
import { isAdmin } from '@/lib/clerk-admin';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/admin/users/[id]/certificates
 * Haal alle certificaten van een gebruiker op
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

    const { id: targetUserId } = await params;

    // Haal alle certificaten van de gebruiker op met certificaat details
    const userCertificates = await db
      .select({
        id: userCertificatesTable.id,
        certificateId: userCertificatesTable.certificateId,
        clerkUserId: userCertificatesTable.clerkUserId,
        achievedDate: userCertificatesTable.achievedDate,
        expiryDate: userCertificatesTable.expiryDate,
        status: userCertificatesTable.status,
        notes: userCertificatesTable.notes,
        assignedBy: userCertificatesTable.assignedBy,
        createdAt: userCertificatesTable.createdAt,
        updatedAt: userCertificatesTable.updatedAt,
        certificate: {
          id: certificatesTable.id,
          name: certificatesTable.name,
          description: certificatesTable.description,
          discipline: certificatesTable.discipline,
          expires: certificatesTable.expires,
          validityYears: certificatesTable.validityYears,
        },
      })
      .from(userCertificatesTable)
      .innerJoin(
        certificatesTable,
        eq(userCertificatesTable.certificateId, certificatesTable.id)
      )
      .where(eq(userCertificatesTable.clerkUserId, targetUserId))
      .orderBy(desc(userCertificatesTable.achievedDate));

    return NextResponse.json({
      certificates: userCertificates,
      total: userCertificates.length,
    });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen certificaten' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[id]/certificates
 * Ken een certificaat toe aan een gebruiker
 */
export async function POST(
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

    const { id: targetUserId } = await params;
    const body = await req.json();
    const { certificateId, achievedDate, notes } = body;

    // Validatie
    if (!certificateId || !achievedDate) {
      return NextResponse.json(
        { error: 'Certificaat ID en behaaldatum zijn verplicht' },
        { status: 400 }
      );
    }

    // Check of certificaat bestaat
    const [certificate] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, certificateId))
      .limit(1);

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificaat niet gevonden' },
        { status: 404 }
      );
    }

    // Bereken verloopdatum
    let expiryDate: Date | null = null;
    if (certificate.expires && certificate.validityYears) {
      const achieved = new Date(achievedDate);
      expiryDate = new Date(achieved);
      expiryDate.setFullYear(expiryDate.getFullYear() + certificate.validityYears);
    }

    // Maak user certificate aan
    const [newUserCertificate] = await db
      .insert(userCertificatesTable)
      .values({
        certificateId,
        clerkUserId: targetUserId,
        achievedDate: new Date(achievedDate),
        expiryDate: expiryDate,
        status: 'active',
        notes: notes || null,
        assignedBy: userId,
      })
      .returning();

    // Haal certificaat details op voor response
    const [userCertWithDetails] = await db
      .select({
        id: userCertificatesTable.id,
        certificateId: userCertificatesTable.certificateId,
        clerkUserId: userCertificatesTable.clerkUserId,
        achievedDate: userCertificatesTable.achievedDate,
        expiryDate: userCertificatesTable.expiryDate,
        status: userCertificatesTable.status,
        notes: userCertificatesTable.notes,
        assignedBy: userCertificatesTable.assignedBy,
        createdAt: userCertificatesTable.createdAt,
        updatedAt: userCertificatesTable.updatedAt,
        certificate: {
          id: certificatesTable.id,
          name: certificatesTable.name,
          description: certificatesTable.description,
          discipline: certificatesTable.discipline,
          expires: certificatesTable.expires,
          validityYears: certificatesTable.validityYears,
        },
      })
      .from(userCertificatesTable)
      .innerJoin(
        certificatesTable,
        eq(userCertificatesTable.certificateId, certificatesTable.id)
      )
      .where(eq(userCertificatesTable.id, newUserCertificate.id))
      .limit(1);

    return NextResponse.json(userCertWithDetails, { status: 201 });
  } catch (error) {
    console.error('Error assigning certificate:', error);
    return NextResponse.json(
      { error: 'Fout bij toekennen certificaat' },
      { status: 500 }
    );
  }
}

