import 'dotenv/config';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '../lib/db';
import { certificatesTable, userCertificatesTable } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Script om testusers aan te maken en certificaten toe te kennen
 * Run met: npx tsx scripts/seed-test-users-with-certificates.ts
 */

// Helper functie om een datum X maanden geleden te krijgen
function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

// Helper functie om een datum X jaren geleden te krijgen
function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

const testUsers = [
  {
    email: 'test.elektra@example.com',
    firstName: 'Jan',
    lastName: 'Elektra',
    password: 'Test123!',
    certificates: [
      { name: 'NEN 3140', achievedMonthsAgo: 2 }, // Recent behaald
      { name: 'BEI-BLS', achievedMonthsAgo: 36 }, // 3 jaar geleden, mogelijk verlopen
    ],
  },
  {
    email: 'test.gas@example.com',
    firstName: 'Piet',
    lastName: 'Gas',
    password: 'Test123!',
    certificates: [
      { name: 'VIAG', achievedMonthsAgo: 6 },
      { name: 'Gastec QA / Kiwa', achievedMonthsAgo: 48 }, // 4 jaar geleden
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
      { name: 'FttX-certificering', achievedMonthsAgo: 60 }, // 5 jaar geleden, verlopen
    ],
  },
  {
    email: 'test.algemeen@example.com',
    firstName: 'Lisa',
    lastName: 'Algemeen',
    password: 'Test123!',
    certificates: [
      { name: 'VCA Basis', achievedMonthsAgo: 1 },
      { name: 'VOL-VCA', achievedMonthsAgo: 120 }, // 10 jaar geleden, verlopen
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
      { name: 'NEN 3140', achievedMonthsAgo: 40 }, // 3+ jaar geleden, verlopen
      { name: 'VIAG', achievedMonthsAgo: 6 },
      { name: 'KIAD', achievedMonthsAgo: 50 }, // 4+ jaar geleden, verlopen
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
      { name: 'BEI-BHS', achievedMonthsAgo: 38 }, // 3+ jaar geleden, verlopen
      { name: 'NEN 3840', achievedMonthsAgo: 4 },
    ],
  },
  {
    email: 'test.gas2@example.com',
    firstName: 'Wim',
    lastName: 'Gas',
    password: 'Test123!',
    certificates: [
      { name: 'VIAG', achievedMonthsAgo: 42 }, // 3+ jaar geleden, verlopen
      { name: 'Gastec QA / Kiwa', achievedMonthsAgo: 2 },
    ],
  },
  {
    email: 'test.water2@example.com',
    firstName: 'Dirk',
    lastName: 'Water',
    password: 'Test123!',
    certificates: [
      { name: 'KIAD', achievedMonthsAgo: 50 }, // 4+ jaar geleden, verlopen
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
      { name: 'VCA Basis', achievedMonthsAgo: 130 }, // 10+ jaar geleden, verlopen
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
      { name: 'CROW 96a', achievedMonthsAgo: 70 }, // 5+ jaar geleden, verlopen
      { name: 'CROW 96b', achievedMonthsAgo: 3 },
    ],
  },
  {
    email: 'test.grondwerk2@example.com',
    firstName: 'Rob',
    lastName: 'Grondwerk',
    password: 'Test123!',
    certificates: [
      { name: 'CROW 500', achievedMonthsAgo: 48 }, // 4 jaar geleden
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
      { name: 'NEN 3140', achievedMonthsAgo: 42 }, // 3+ jaar geleden, verlopen
      { name: 'VIAG', achievedMonthsAgo: 8 },
      { name: 'KIAD', achievedMonthsAgo: 1 },
      { name: 'SECT-certificering', achievedMonthsAgo: 65 }, // 5+ jaar geleden, verlopen
    ],
  },
  {
    email: 'test.multi2@example.com',
    firstName: 'Anna',
    lastName: 'Multi',
    password: 'Test123!',
    certificates: [
      { name: 'VOL-VCA', achievedMonthsAgo: 3 },
      { name: 'BEI-BLS', achievedMonthsAgo: 40 }, // 3+ jaar geleden, verlopen
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
      { name: 'VCA Basis', achievedMonthsAgo: 140 }, // 10+ jaar geleden, verlopen
      { name: 'GPI', achievedMonthsAgo: 15 },
      { name: 'BHV', achievedMonthsAgo: 14 },
      { name: 'CROW 96a', achievedMonthsAgo: 1 },
      { name: 'KIAD', achievedMonthsAgo: 52 }, // 4+ jaar geleden, verlopen
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
      { name: 'VIAG', achievedMonthsAgo: 44 }, // 3+ jaar geleden, verlopen
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
      { name: 'Gastec QA / Kiwa', achievedMonthsAgo: 62 }, // 5+ jaar geleden, verlopen
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
      { name: 'VOL-VCA', achievedMonthsAgo: 125 }, // 10+ jaar geleden, verlopen
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
      { name: 'NEN 3140', achievedMonthsAgo: 38 }, // 3+ jaar geleden, verlopen
      { name: 'VIAG', achievedMonthsAgo: 5 },
      { name: 'SECT-certificering', achievedMonthsAgo: 68 }, // 5+ jaar geleden, verlopen
      { name: 'CROW 96a', achievedMonthsAgo: 1 },
    ],
  },
];

async function seedTestUsers() {
  try {
    console.log('🚀 Start testusers aanmaken en certificaten toekennen...\n');

    const client = await clerkClient();

    // Haal alle certificaten op
    const allCertificates = await db.select().from(certificatesTable);
    const certificateMap = new Map(allCertificates.map(c => [c.name, c]));

    let usersCreated = 0;
    let certificatesAssigned = 0;
    let errors = 0;

    for (const testUser of testUsers) {
      try {
        // Check of user al bestaat
        const existingUsers = await client.users.getUserList({
          emailAddress: [testUser.email],
        });

        let userId: string;

        if (existingUsers.data.length > 0) {
          console.log(`⏭️  User ${testUser.email} bestaat al, gebruik bestaande user`);
          userId = existingUsers.data[0].id;
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
          console.log(`✅ User aangemaakt: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);
          usersCreated++;
        }

        // Ken certificaten toe
        for (const certConfig of testUser.certificates) {
          const certName = typeof certConfig === 'string' ? certConfig : certConfig.name;
          const achievedMonthsAgo = typeof certConfig === 'string' ? 0 : certConfig.achievedMonthsAgo;
          
          const certificate = certificateMap.get(certName);
          
          if (!certificate) {
            console.log(`⚠️  Certificaat "${certName}" niet gevonden, overslaan`);
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
            console.log(`  ⏭️  ${certName} al toegekend aan ${testUser.firstName}`);
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
            assignedBy: 'system', // System user voor test data
            notes: `Test user certificaat (behaald ${achievedMonthsAgo} maanden geleden)`,
          });

          const statusText = status === 'expired' ? ' (VERLOPEN)' : '';
          console.log(`  ✅ ${certName} toegekend aan ${testUser.firstName}${statusText}`);
          certificatesAssigned++;
        }
      } catch (error: any) {
        console.error(`❌ Fout bij ${testUser.email}:`, error.message || error);
        errors++;
      }
    }

    console.log(`\n✨ Klaar!`);
    console.log(`   - ${usersCreated} nieuwe users aangemaakt`);
    console.log(`   - ${certificatesAssigned} certificaten toegekend`);
    if (errors > 0) {
      console.log(`   - ${errors} fouten opgetreden`);
    }
  } catch (error) {
    console.error('❌ Fout bij seeden testusers:', error);
    process.exit(1);
  }
}

seedTestUsers();

