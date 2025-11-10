import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

/**
 * Script om aiSafetyIncidentPrompt kolom toe te voegen aan user_preferences
 * Run met: npx tsx scripts/add-ai-prompt-column.ts
 */
async function addAIPromptColumn() {
  try {
    console.log('🚀 Voeg aiSafetyIncidentPrompt kolom toe aan user_preferences...\n');

    await db.execute(sql`
      ALTER TABLE "user_preferences" 
      ADD COLUMN IF NOT EXISTS "aiSafetyIncidentPrompt" text
    `);

    console.log('✅ aiSafetyIncidentPrompt kolom succesvol toegevoegd!\n');
    console.log('✨ Migratie succesvol afgerond!');
    
  } catch (error) {
    console.error('❌ Fout bij migratie:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

addAIPromptColumn();

