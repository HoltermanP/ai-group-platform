import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

/**
 * Manual migration script om de database te updaten
 * Run met: npx tsx scripts/migrate-db.ts
 */
async function migrate() {
  try {
    console.log('🚀 Start database migratie...\n');

    // 1. Maak organizations tabel aan
    console.log('📦 Maak organizations tabel aan...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL UNIQUE,
        "description" text,
        "logo" text,
        "website" varchar(255),
        "contactEmail" varchar(255),
        "contactPhone" varchar(50),
        "address" text,
        "status" varchar(50) DEFAULT 'active',
        "createdBy" varchar(255) NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Organizations tabel aangemaakt\n');

    // 2. Maak user_roles tabel aan
    console.log('📦 Maak user_roles tabel aan...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "clerkUserId" varchar(255) NOT NULL UNIQUE,
        "role" varchar(50) NOT NULL DEFAULT 'user',
        "assignedBy" varchar(255),
        "assignedAt" timestamp DEFAULT now() NOT NULL,
        "notes" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ User_roles tabel aangemaakt\n');

    // 3. Maak organization_members tabel aan
    console.log('📦 Maak organization_members tabel aan...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "organization_members" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "organizationId" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "clerkUserId" varchar(255) NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'member',
        "permissions" text,
        "invitedBy" varchar(255),
        "joinedAt" timestamp DEFAULT now() NOT NULL,
        "status" varchar(50) DEFAULT 'active',
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Organization_members tabel aangemaakt\n');

    // 4. Voeg organizationId toe aan projects (nullable voor migratie)
    console.log('📦 Voeg organizationId kolom toe aan projects...');
    await db.execute(sql`
      ALTER TABLE "projects" 
      ADD COLUMN IF NOT EXISTS "organizationId" integer 
      REFERENCES "organizations"("id") ON DELETE CASCADE
    `);
    console.log('✅ OrganizationId kolom toegevoegd aan projects\n');

    // 5. Voeg organizationId toe aan safety_incidents (nullable)
    console.log('📦 Voeg organizationId kolom toe aan safety_incidents...');
    await db.execute(sql`
      ALTER TABLE "safety_incidents" 
      ADD COLUMN IF NOT EXISTS "organizationId" integer 
      REFERENCES "organizations"("id") ON DELETE SET NULL
    `);
    console.log('✅ OrganizationId kolom toegevoegd aan safety_incidents\n');

    // 6. Update user_preferences met defaultOrganizationId
    console.log('📦 Voeg defaultOrganizationId kolom toe aan user_preferences...');
    await db.execute(sql`
      ALTER TABLE "user_preferences" 
      ADD COLUMN IF NOT EXISTS "defaultOrganizationId" integer 
      REFERENCES "organizations"("id") ON DELETE SET NULL
    `);
    console.log('✅ DefaultOrganizationId kolom toegevoegd aan user_preferences\n');

    console.log('✨ Database migratie succesvol afgerond!');
    console.log('\n📝 Volgende stap: Maak een eerste organisatie en admin gebruiker aan');
    
  } catch (error) {
    console.error('❌ Fout bij migratie:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrate();

