import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userCertificatesTable, certificatesTable } from '@/lib/db/schema';
import { getAllUsers, isAdmin } from '@/lib/clerk-admin';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/certificates/users
 * Haal alle gebruikers op met hun certificaten
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

    // Haal alle certificaten op per gebruiker
    const allUserCertificates = await db
      .select({
        id: userCertificatesTable.id,
        certificateId: userCertificatesTable.certificateId,
        clerkUserId: userCertificatesTable.clerkUserId,
        achievedDate: userCertificatesTable.achievedDate,
        expiryDate: userCertificatesTable.expiryDate,
        status: userCertificatesTable.status,
        notes: userCertificatesTable.notes,
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
      );

    // Groepeer certificaten per gebruiker
    const certificatesByUser = new Map<string, typeof allUserCertificates>();
    allUserCertificates.forEach(uc => {
      if (!certificatesByUser.has(uc.clerkUserId)) {
        certificatesByUser.set(uc.clerkUserId, []);
      }
      certificatesByUser.get(uc.clerkUserId)!.push(uc);
    });

    // Combineer gebruikers met hun certificaten
    const usersWithCertificates = users.map(user => ({
      ...user,
      certificates: certificatesByUser.get(user.id) || [],
    }));

    return NextResponse.json({
      users: usersWithCertificates,
      total: usersWithCertificates.length,
    });
  } catch (error) {
    console.error('Error fetching users with certificates:', error);
    return NextResponse.json(
      { error: 'Fout bij ophalen gebruikers met certificaten' },
      { status: 500 }
    );
  }
}

