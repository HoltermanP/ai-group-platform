import 'dotenv/config';
import { db } from '../lib/db';
import { certificatesTable } from '../lib/db/schema';

/**
 * Script om standaard certificaten toe te voegen aan de catalogus
 * Run met: npx tsx scripts/seed-certificates.ts
 */

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
    discipline: 'Algemeen', // Grondwerk is niet in de lijst, gebruik Algemeen
    expires: true,
    validityYears: 4, // Gemiddelde van 3-5 jaar
  },
  {
    name: 'CROW 96a',
    description: 'Veilig werken langs de weg (uitvoerend)',
    discipline: 'Algemeen', // Grondwerk is niet in de lijst, gebruik Algemeen
    expires: true,
    validityYears: 5,
  },
  {
    name: 'CROW 96b',
    description: 'Veilig werken langs de weg (leidinggevend/werkverantwoordelijke)',
    discipline: 'Algemeen', // Grondwerk is niet in de lijst, gebruik Algemeen
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

async function seedCertificates() {
  try {
    console.log('🚀 Start certificaten seeden...\n');

    // Check welke certificaten al bestaan
    const existing = await db.select().from(certificatesTable);
    const existingNames = new Set(existing.map(c => c.name));

    let added = 0;
    let skipped = 0;

    for (const cert of certificates) {
      if (existingNames.has(cert.name)) {
        console.log(`⏭️  Overslaan: ${cert.name} (bestaat al)`);
        skipped++;
        continue;
      }

      await db.insert(certificatesTable).values({
        name: cert.name,
        description: cert.description,
        discipline: cert.discipline,
        expires: cert.expires,
        validityYears: cert.validityYears,
        status: 'active',
        createdBy: 'system', // System user voor seed data
      });

      console.log(`✅ Toegevoegd: ${cert.name} (${cert.discipline}, ${cert.validityYears} jaar)`);
      added++;
    }

    console.log(`\n✨ Klaar! ${added} certificaten toegevoegd, ${skipped} overgeslagen.`);
  } catch (error) {
    console.error('❌ Fout bij seeden certificaten:', error);
    process.exit(1);
  }
}

seedCertificates();

