import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userCertificatesTable, certificatesTable } from '@/lib/db/schema';
import { getAllUsers, isAdmin } from '@/lib/clerk-admin';
import { eq, and, lt, sql } from 'drizzle-orm';

/**
 * GET /api/certificates/expired
 * Haal alle verlopen certificaten op
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

    // Update eerst alle verlopen certificaten naar status 'expired'
    const now = new Date();
    await db
      .update(userCertificatesTable)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(
        and(
          eq(userCertificatesTable.status, 'active'),
          sql`${userCertificatesTable.expiryDate} IS NOT NULL`,
          sql`${userCertificatesTable.expiryDate} < ${now}`
        )
      );

    // Haal alle gebruikers op
    const users = await getAllUsers();

    // Haal alle verlopen certificaten op
    const expiredCertificates = await db
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
      .where(eq(userCertificatesTable.status, 'expired'))
      .orderBy(userCertificatesTable.expiryDate);

    // Groepeer certificaten per gebruiker
    const certificatesByUser = new Map<string, typeof expiredCertificates>();
    expiredCertificates.forEach(uc => {
      if (!certificatesByUser.has(uc.clerkUserId)) {
        certificatesByUser.set(uc.clerkUserId, []);
      }
      certificatesByUser.get(uc.clerkUserId)!.push(uc);
    });

    // Combineer gebruikers met hun verlopen certificaten
    const usersWithExpiredCertificates = users
      .filter(user => certificatesByUser.has(user.id))
      .map(user => ({
        ...user,
        certificates: certificatesByUser.get(user.id) || [],
      }));

    return NextResponse.json({
      users: usersWithExpiredCertificates,
      total: expiredCertificates.length,
      totalUsers: usersWithExpiredCertificates.length,
    });
  } catch (error) {
    console.error('Error fetching expired certificates:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen verlopen certificaten' },
      { status: 500 }
    );
  }
}

