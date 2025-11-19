/**
 * Migratie script om bestaande critical incident recipients om te zetten naar notification rules
 * Run met: npx tsx scripts/migrate-critical-recipients-to-rules.ts
 */

import { db } from '../lib/db';
import { criticalIncidentRecipientsTable, notificationRulesTable } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('🔄 Start migratie van critical incident recipients naar notification rules...\n');

    // Haal alle critical incident recipients op
    const recipients = await db
      .select()
      .from(criticalIncidentRecipientsTable)
      .where(eq(criticalIncidentRecipientsTable.enabled, true));

    console.log(`📋 Gevonden ${recipients.length} actieve recipient(s) om te migreren\n`);

    if (recipients.length === 0) {
      console.log('✅ Geen recipients om te migreren');
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      try {
        // Check of er al een rule bestaat voor deze gebruiker met dezelfde filters
        const existingRules = await db
          .select()
          .from(notificationRulesTable)
          .where(eq(notificationRulesTable.recipientId, recipient.clerkUserId));

        // Check of er al een rule is met critical severity filter
        const hasCriticalRule = existingRules.some(rule => {
          try {
            const filters = JSON.parse(rule.filters);
            return filters.severity && filters.severity.includes('critical');
          } catch {
            return false;
          }
        });

        if (hasCriticalRule) {
          console.log(`⏭️  Regel bestaat al voor gebruiker ${recipient.clerkUserId}, overslaan...`);
          skipped++;
          continue;
        }

        // Bepaal kanalen op basis van beschikbare data
        const channels = ['in_app', 'email']; // Altijd in-app en email
        if (recipient.phoneNumber) {
          channels.push('whatsapp');
        }

        // Maak notification rule aan
        await db.insert(notificationRulesTable).values({
          name: `Kritieke Incidenten - ${recipient.clerkUserId}`,
          description: 'Geautomatiseerd gemigreerd van critical incident recipients',
          recipientType: 'user',
          recipientId: recipient.clerkUserId,
          channels: JSON.stringify(channels),
          filters: JSON.stringify({
            severity: ['critical'], // Alleen critical incidents
          }),
          organizationId: null,
          enabled: recipient.enabled,
          createdBy: recipient.addedBy || 'system',
        });

        migrated++;
        console.log(`✅ Gemigreerd: gebruiker ${recipient.clerkUserId}`);
      } catch (error) {
        console.error(`❌ Fout bij migreren recipient ${recipient.clerkUserId}:`, error);
      }
    }

    console.log(`\n✅ Migratie voltooid:`);
    console.log(`   - ${migrated} rule(s) aangemaakt`);
    console.log(`   - ${skipped} recipient(s) overgeslagen (regel bestaat al)`);
    console.log(`\n⚠️  Let op: De oude critical_incident_recipients tabel blijft bestaan voor backward compatibility.`);
    console.log(`   Je kunt deze later verwijderen als alle migraties zijn voltooid.`);
  } catch (error) {
    console.error('❌ Fout bij migratie:', error);
    process.exit(1);
  }
}

migrate()
  .then(() => {
    console.log('\n✅ Migratie script voltooid');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Onverwachte fout:', error);
    process.exit(1);
  });

