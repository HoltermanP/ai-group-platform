import "dotenv/config";
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

/**
 * Script om de unique constraint toe te voegen aan user_module_permissions
 */
async function addUniqueConstraint() {
  try {
    console.log('🔍 Controleer unique constraint...\n');

    // Check of de constraint al bestaat
    const constraintCheck = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'user_module_permissions' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%clerkUserId%module%'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('✅ Unique constraint bestaat al\n');
      console.log('Constraint:', constraintCheck.rows[0]);
      return;
    }

    console.log('📦 Voeg unique constraint toe...');
    
    // Voeg de unique constraint toe
    await db.execute(sql`
      ALTER TABLE "user_module_permissions" 
      ADD CONSTRAINT "user_module_permissions_clerkUserId_module_unique" 
      UNIQUE("clerkUserId", "module")
    `);

    console.log('✅ Unique constraint succesvol toegevoegd\n');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Unique constraint bestaat al (via andere naam)\n');
    } else {
      console.error('❌ Fout bij toevoegen constraint:', error);
      throw error;
    }
  } finally {
    process.exit(0);
  }
}

addUniqueConstraint();

