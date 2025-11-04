import "dotenv/config";
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

/**
 * Script om de user_module_permissions tabel aan te maken
 * Run met: npx tsx scripts/create-module-permissions-table.ts
 */
async function createModulePermissionsTable() {
  try {
    console.log('🚀 Maak user_module_permissions tabel aan...\n');

    // Check of de tabel al bestaat
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_module_permissions'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ Tabel user_module_permissions bestaat al\n');
      return;
    }

    // Maak de tabel aan
    await db.execute(sql`
      CREATE TABLE "user_module_permissions" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "clerkUserId" varchar(255) NOT NULL,
        "module" varchar(50) NOT NULL,
        "granted" boolean DEFAULT true,
        "grantedBy" varchar(255),
        "grantedAt" timestamp DEFAULT now() NOT NULL,
        "notes" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "user_module_permissions_clerkUserId_module_unique" UNIQUE("clerkUserId", "module")
      )
    `);

    console.log('✅ Tabel user_module_permissions succesvol aangemaakt\n');
    console.log('✨ Klaar! Module rechten kunnen nu worden beheerd.\n');
  } catch (error) {
    console.error('❌ Fout bij aanmaken tabel:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createModulePermissionsTable();

