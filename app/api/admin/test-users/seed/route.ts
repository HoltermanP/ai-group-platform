import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { certificatesTable, userCertificatesTable } from '@/lib/db/schema';
import { isAdmin } from '@/lib/clerk-admin';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/admin/test-users/seed
 * Maak testusers aan en ken certificaten toe
 * Alleen toegankelijk voor admins
 */
export async function POST() {
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

    // Helper functie om een datum X maanden geleden te krijgen
    const monthsAgo = (months: number): Date => {
      const date = new Date();
      date.setMonth(date.getMonth() - months);
      return date;
    };

    const testUsers = [
      {
        email: 'test.elektra@example.com',
        firstName: 'Jan',
        lastName: 'Elektra',
        password: 'Test123!',
        certificates: [
          { name: 'NEN 3140', achievedMonthsAgo: 2 },
          { name: 'BEI-BLS', achievedMonthsAgo: 36 },
        ],
      },
      {
        email: 'test.gas@example.com',
        firstName: 'Piet',
        lastName: 'Gas',
        password: 'Test123!',
        certificates: [
          { name: 'VIAG', achievedMonthsAgo: 6 },
          { name: 'Gastec QA / Kiwa', achievedMonthsAgo: 48 },
        ],
      },
      {
        email: 'test.water@example.com',
        firstName: 'Klaas',
        lastName: 'Water',
        password: 'Test123!',
        certificates: [
          { name: 'KIAD', achievedMonthsAgo: 12 },
        ],
      },
      {
        email: 'test.media@example.com',
        firstName: 'Marie',
        lastName: 'Media',
        password: 'Test123!',
        certificates: [
          { name: 'SECT-certificering', achievedMonthsAgo: 3 },
          { name: 'FttX-certificering', achievedMonthsAgo: 60 },
        ],
      },
      {
        email: 'test.algemeen@example.com',
        firstName: 'Lisa',
        lastName: 'Algemeen',
        password: 'Test123!',
        certificates: [
          { name: 'VCA Basis', achievedMonthsAgo: 1 },
          { name: 'VOL-VCA', achievedMonthsAgo: 120 },
          { name: 'GPI', achievedMonthsAgo: 15 },
          { name: 'BHV', achievedMonthsAgo: 18 },
        ],
      },
      {
        email: 'test.compleet@example.com',
        firstName: 'Tom',
        lastName: 'Compleet',
        password: 'Test123!',
        certificates: [
          { name: 'VCA Basis', achievedMonthsAgo: 24 },
          { name: 'NEN 3140', achievedMonthsAgo: 40 },
          { name: 'VIAG', achievedMonthsAgo: 6 },
          { name: 'KIAD', achievedMonthsAgo: 50 },
          { name: 'SECT-certificering', achievedMonthsAgo: 2 },
        ],
      },
      {
        email: 'test.elektra2@example.com',
        firstName: 'Henk',
        lastName: 'Elektra',
        password: 'Test123!',
        certificates: [
          { name: 'BEI-BLS', achievedMonthsAgo: 1 },
          { name: 'BEI-BHS', achievedMonthsAgo: 38 },
          { name: 'NEN 3840', achievedMonthsAgo: 4 },
        ],
      },
      {
        email: 'test.gas2@example.com',
        firstName: 'Wim',
        lastName: 'Gas',
        password: 'Test123!',
        certificates: [
          { name: 'VIAG', achievedMonthsAgo: 42 },
          { name: 'Gastec QA / Kiwa', achievedMonthsAgo: 2 },
        ],
      },
      {
        email: 'test.water2@example.com',
        firstName: 'Dirk',
        lastName: 'Water',
        password: 'Test123!',
        certificates: [
          { name: 'KIAD', achievedMonthsAgo: 50 },
        ],
      },
      {
        email: 'test.media2@example.com',
        firstName: 'Sandra',
        lastName: 'Media',
        password: 'Test123!',
        certificates: [
          { name: 'SECT-certificering', achievedMonthsAgo: 3 },
          { name: 'FttX-certificering', achievedMonthsAgo: 1 },
        ],
      },
      {
        email: 'test.algemeen2@example.com',
        firstName: 'Emma',
        lastName: 'Algemeen',
        password: 'Test123!',
        certificates: [
          { name: 'VCA Basis', achievedMonthsAgo: 130 },
          { name: 'VOL-VCA', achievedMonthsAgo: 2 },
          { name: 'GPI', achievedMonthsAgo: 14 },
          { name: 'BHV', achievedMonthsAgo: 13 },
        ],
      },
      {
        email: 'test.grondwerk1@example.com',
        firstName: 'Bas',
        lastName: 'Grondwerk',
        password: 'Test123!',
        certificates: [
          { name: 'CROW 500', achievedMonthsAgo: 6 },
          { name: 'CROW 96a', achievedMonthsAgo: 70 },
          { name: 'CROW 96b', achievedMonthsAgo: 3 },
        ],
      },
      {
        email: 'test.grondwerk2@example.com',
        firstName: 'Rob',
        lastName: 'Grondwerk',
        password: 'Test123!',
        certificates: [
          { name: 'CROW 500', achievedMonthsAgo: 48 },
          { name: 'CROW 96a', achievedMonthsAgo: 2 },
        ],
      },
      {
        email: 'test.multi1@example.com',
        firstName: 'Frits',
        lastName: 'Multi',
        password: 'Test123!',
        certificates: [
          { name: 'VCA Basis', achievedMonthsAgo: 5 },
          { name: 'NEN 3140', achievedMonthsAgo: 42 },
          { name: 'VIAG', achievedMonthsAgo: 8 },
          { name: 'KIAD', achievedMonthsAgo: 1 },
          { name: 'SECT-certificering', achievedMonthsAgo: 65 },
        ],
      },
      {
        email: 'test.multi2@example.com',
        firstName: 'Anna',
        lastName: 'Multi',
        password: 'Test123!',
        certificates: [
          { name: 'VOL-VCA', achievedMonthsAgo: 3 },
          { name: 'BEI-BLS', achievedMonthsAgo: 40 },
          { name: 'Gastec QA / Kiwa', achievedMonthsAgo: 6 },
          { name: 'FttX-certificering', achievedMonthsAgo: 2 },
        ],
      },
      {
        email: 'test.multi3@example.com',
        firstName: 'Mark',
        lastName: 'Multi',
        password: 'Test123!',
        certificates: [
          { name: 'VCA Basis', achievedMonthsAgo: 140 },
          { name: 'GPI', achievedMonthsAgo: 15 },
          { name: 'BHV', achievedMonthsAgo: 14 },
          { name: 'CROW 96a', achievedMonthsAgo: 1 },
          { name: 'KIAD', achievedMonthsAgo: 52 },
        ],
      },
      {
        email: 'test.multi4@example.com',
        firstName: 'Sophie',
        lastName: 'Multi',
        password: 'Test123!',
        certificates: [
          { name: 'VOL-VCA', achievedMonthsAgo: 1 },
          { name: 'NEN 3140', achievedMonthsAgo: 2 },
          { name: 'VIAG', achievedMonthsAgo: 44 },
          { name: 'SECT-certificering', achievedMonthsAgo: 3 },
        ],
      },
      {
        email: 'test.multi5@example.com',
        firstName: 'Jeroen',
        lastName: 'Multi',
        password: 'Test123!',
        certificates: [
          { name: 'VCA Basis', achievedMonthsAgo: 6 },
          { name: 'BEI-BLS', achievedMonthsAgo: 1 },
          { name: 'Gastec QA / Kiwa', achievedMonthsAgo: 62 },
          { name: 'FttX-certificering', achievedMonthsAgo: 4 },
          { name: 'CROW 500', achievedMonthsAgo: 2 },
        ],
      },
      {
        email: 'test.multi6@example.com',
        firstName: 'Laura',
        lastName: 'Multi',
        password: 'Test123!',
        certificates: [
          { name: 'VOL-VCA', achievedMonthsAgo: 125 },
          { name: 'GPI', achievedMonthsAgo: 13 },
          { name: 'BHV', achievedMonthsAgo: 12 },
          { name: 'KIAD', achievedMonthsAgo: 3 },
        ],
      },
      {
        email: 'test.multi7@example.com',
        firstName: 'Kevin',
        lastName: 'Multi',
        password: 'Test123!',
        certificates: [
          { name: 'VCA Basis', achievedMonthsAgo: 2 },
          { name: 'NEN 3140', achievedMonthsAgo: 38 },
          { name: 'VIAG', achievedMonthsAgo: 5 },
          { name: 'SECT-certificering', achievedMonthsAgo: 68 },
          { name: 'CROW 96a', achievedMonthsAgo: 1 },
        ],
      },
    ];

    const client = await clerkClient();

    // Haal alle certificaten op
    const allCertificates = await db.select().from(certificatesTable);
    const certificateMap = new Map(allCertificates.map(c => [c.name, c]));

    const results = {
      usersCreated: 0,
      usersSkipped: 0,
      certificatesAssigned: 0,
      certificatesSkipped: 0,
      errors: [] as string[],
      details: [] as Array<{
        user: string;
        action: string;
        certificates: string[];
      }>,
    };

    for (const testUser of testUsers) {
      try {
        // Check of user al bestaat
        const existingUsers = await client.users.getUserList({
          emailAddress: [testUser.email],
        });

        let userId: string;

        if (existingUsers.data.length > 0) {
          userId = existingUsers.data[0].id;
          results.usersSkipped++;
          results.details.push({
            user: `${testUser.firstName} ${testUser.lastName}`,
            action: 'skipped',
            certificates: [],
          });
        } else {
          // Maak nieuwe user aan
          const newUser = await client.users.createUser({
            emailAddress: [testUser.email],
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            password: testUser.password,
            skipPasswordChecks: true,
          });
          userId = newUser.id;
          results.usersCreated++;
          results.details.push({
            user: `${testUser.firstName} ${testUser.lastName}`,
            action: 'created',
            certificates: [],
          });
        }

        // Ken certificaten toe
        const assignedCerts: string[] = [];
        for (const certConfig of testUser.certificates) {
          const certName = typeof certConfig === 'string' ? certConfig : certConfig.name;
          const achievedMonthsAgo = typeof certConfig === 'string' ? 0 : certConfig.achievedMonthsAgo;
          
          const certificate = certificateMap.get(certName);
          
          if (!certificate) {
            results.errors.push(`Certificaat "${certName}" niet gevonden voor ${testUser.email}`);
            continue;
          }

          // Check of user al dit certificaat heeft
          const existing = await db
            .select()
            .from(userCertificatesTable)
            .where(
              and(
                eq(userCertificatesTable.clerkUserId, userId),
                eq(userCertificatesTable.certificateId, certificate.id)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            results.certificatesSkipped++;
            continue;
          }

          // Bereken achieved date (X maanden geleden)
          const achievedDate = monthsAgo(achievedMonthsAgo);

          // Bereken expiry date
          let expiryDate: Date | null = null;
          if (certificate.expires && certificate.validityYears) {
            expiryDate = new Date(achievedDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + certificate.validityYears);
          }

          // Bepaal status: expired als expiryDate in het verleden is
          const now = new Date();
          const status = expiryDate && expiryDate < now ? 'expired' : 'active';

          // Ken certificaat toe
          await db.insert(userCertificatesTable).values({
            certificateId: certificate.id,
            clerkUserId: userId,
            achievedDate: achievedDate,
            expiryDate: expiryDate,
            status: status,
            assignedBy: userId, // Admin user die het seed script uitvoert
            notes: `Test user certificaat (behaald ${achievedMonthsAgo} maanden geleden)`,
          });

          assignedCerts.push(certName);
          results.certificatesAssigned++;
        }

        // Update details met toegekende certificaten
        const detail = results.details.find(d => d.user === `${testUser.firstName} ${testUser.lastName}`);
        if (detail) {
          detail.certificates = assignedCerts;
        }
      } catch (error: any) {
        results.errors.push(`${testUser.email}: ${error.message || 'Onbekende fout'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.usersCreated} users aangemaakt, ${results.usersSkipped} overgeslagen. ${results.certificatesAssigned} certificaten toegekend.`,
      ...results,
    });
  } catch (error) {
    console.error('Error seeding test users:', error);
    return NextResponse.json(
      { error: 'Fout bij seeden testusers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

