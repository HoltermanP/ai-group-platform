import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userCertificatesTable } from '@/lib/db/schema';
import { isAdmin } from '@/lib/clerk-admin';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/admin/users/[id]/certificates/[certificateId]
 * Verwijder een certificaat toekenning van een gebruiker
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; certificateId: string }> }
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

    const { id: targetUserId, certificateId: certificateIdParam } = await params;
    const userCertificateId = parseInt(certificateIdParam);
    
    if (isNaN(userCertificateId)) {
      return NextResponse.json(
        { error: 'Ongeldig certificaat toekenning ID' },
        { status: 400 }
      );
    }

    // Check of toekenning bestaat en bij de juiste gebruiker hoort
    const [existing] = await db
      .select()
      .from(userCertificatesTable)
      .where(
        and(
          eq(userCertificatesTable.id, userCertificateId),
          eq(userCertificatesTable.clerkUserId, targetUserId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Certificaat toekenning niet gevonden' },
        { status: 404 }
      );
    }

    // Verwijder toekenning
    await db
      .delete(userCertificatesTable)
      .where(eq(userCertificatesTable.id, userCertificateId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user certificate:', error);
    return NextResponse.json(
      { error: 'Fout bij verwijderen certificaat toekenning' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]/certificates/[certificateId]
 * Update een certificaat toekenning
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; certificateId: string }> }
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

    const { id: targetUserId, certificateId: certificateIdParam } = await params;
    const userCertificateId = parseInt(certificateIdParam);
    
    if (isNaN(userCertificateId)) {
      return NextResponse.json(
        { error: 'Ongeldig certificaat toekenning ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { achievedDate, notes, status } = body;

    // Check of toekenning bestaat
    const [existing] = await db
      .select()
      .from(userCertificatesTable)
      .where(
        and(
          eq(userCertificatesTable.id, userCertificateId),
          eq(userCertificatesTable.clerkUserId, targetUserId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Certificaat toekenning niet gevonden' },
        { status: 404 }
      );
    }

    // Haal certificaat op om expiryDate te herberekenen als achievedDate is gewijzigd
    const { certificatesTable } = await import('@/lib/db/schema');
    const [certificate] = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, existing.certificateId))
      .limit(1);

    let expiryDate = existing.expiryDate;
    if (achievedDate && certificate) {
      if (certificate.expires && certificate.validityYears) {
        const achieved = new Date(achievedDate);
        expiryDate = new Date(achieved);
        expiryDate.setFullYear(expiryDate.getFullYear() + certificate.validityYears);
      } else {
        expiryDate = null;
      }
    }

    // Update toekenning
    const [updated] = await db
      .update(userCertificatesTable)
      .set({
        achievedDate: achievedDate ? new Date(achievedDate) : existing.achievedDate,
        expiryDate: expiryDate,
        notes: notes !== undefined ? notes : existing.notes,
        status: status !== undefined ? status : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(userCertificatesTable.id, userCertificateId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user certificate:', error);
    return NextResponse.json(
      { error: 'Fout bij bijwerken certificaat toekenning' },
      { status: 500 }
    );
  }
}

