import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { certificatesTable } from '@/lib/db/schema';
import { isAdmin } from '@/lib/clerk-admin';

/**
 * POST /api/admin/certificates/seed
 * Seed standaard certificaten in de database
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

    const certificates = [
      {
        name: 'VCA Basis',
        description: 'Veiligheidscertificaat voor uitvoerend personeel op bouw- en infraterreinen',
        discipline: 'Algemeen',
        expires: true,
        validityYears: 10,
      },
      {
        name: 'VOL-VCA',
        description: 'Veiligheidscertificaat voor leidinggevenden en zzp\'ers',
        discipline: 'Algemeen',
        expires: true,
        validityYears: 10,
      },
      {
        name: 'GPI',
        description: 'Generieke Poortinstructie, toegang tot bouwplaatsen',
        discipline: 'Algemeen',
        expires: true,
        validityYears: 1,
      },
      {
        name: 'BHV',
        description: 'Bedrijfshulpverlening, eerste hulp en ontruiming',
        discipline: 'Algemeen',
        expires: true,
        validityYears: 1,
      },
      {
        name: 'CROW 500',
        description: 'Bewijs van Vakbekwaamheid Grondroerder, zorgvuldig grondroeren',
        discipline: 'Algemeen',
        expires: true,
        validityYears: 4,
      },
      {
        name: 'CROW 96a',
        description: 'Veilig werken langs de weg (uitvoerend)',
        discipline: 'Algemeen',
        expires: true,
        validityYears: 5,
      },
      {
        name: 'CROW 96b',
        description: 'Veilig werken langs de weg (leidinggevend/werkverantwoordelijke)',
        discipline: 'Algemeen',
        expires: true,
        validityYears: 5,
      },
      {
        name: 'KIAD',
        description: 'Kwaliteit Instructie Aanleg Drinkwater; hygiëne, veiligheid en techniek',
        discipline: 'Water',
        expires: true,
        validityYears: 4,
      },
      {
        name: 'BEI-BLS',
        description: 'Bedrijfsvoering Elektrische Installaties – Laagspanning (VOP/VP/WV/IV)',
        discipline: 'Elektra',
        expires: true,
        validityYears: 3,
      },
      {
        name: 'BEI-BHS',
        description: 'Bedrijfsvoering Elektrische Installaties – Hoogspanning (VP/WV/IV)',
        discipline: 'Elektra',
        expires: true,
        validityYears: 3,
      },
      {
        name: 'NEN 3140',
        description: 'Norm veilig werken aan laagspanningsinstallaties',
        discipline: 'Elektra',
        expires: true,
        validityYears: 3,
      },
      {
        name: 'NEN 3840',
        description: 'Norm veilig werken aan hoogspanningsinstallaties',
        discipline: 'Elektra',
        expires: true,
        validityYears: 3,
      },
      {
        name: 'VIAG',
        description: 'Veiligheidsinstructie Aardgas (VOP/VP/WV)',
        discipline: 'Gas',
        expires: true,
        validityYears: 3,
      },
      {
        name: 'Gastec QA / Kiwa',
        description: 'Kwaliteitsborging voor gaslassen en PE-materialen',
        discipline: 'Gas',
        expires: true,
        validityYears: 5,
      },
      {
        name: 'SECT-certificering',
        description: 'Kabel- en glasvezelcertificaat (B-, C-, D-modules)',
        discipline: 'Media',
        expires: true,
        validityYears: 5,
      },
      {
        name: 'FttX-certificering',
        description: 'Branchebrede certificering voor glasvezelprofessionals',
        discipline: 'Media',
        expires: true,
        validityYears: 5,
      },
    ];

    // Check welke certificaten al bestaan
    const existing = await db.select().from(certificatesTable);
    const existingNames = new Set(existing.map(c => c.name));

    const results = {
      added: 0,
      skipped: 0,
      certificates: [] as Array<{ name: string; action: string }>,
    };

    for (const cert of certificates) {
      if (existingNames.has(cert.name)) {
        results.skipped++;
        results.certificates.push({ name: cert.name, action: 'skipped' });
        continue;
      }

      await db.insert(certificatesTable).values({
        name: cert.name,
        description: cert.description,
        discipline: cert.discipline,
        expires: cert.expires,
        validityYears: cert.validityYears,
        status: 'active',
        createdBy: userId,
      });

      results.added++;
      results.certificates.push({ name: cert.name, action: 'added' });
    }

    return NextResponse.json({
      success: true,
      message: `${results.added} certificaten toegevoegd, ${results.skipped} overgeslagen`,
      ...results,
    });
  } catch (error) {
    console.error('Error seeding certificates:', error);
    return NextResponse.json(
      { error: 'Fout bij seeden certificaten', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

