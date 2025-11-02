import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Fix database schema door kolommen toe te voegen en data te koppelen
 */

async function fixSchema() {
  console.log("🔧 Fixing database schema...\n");

  try {
    // 1. Voeg organizationId toe aan projects
    console.log("1. Adding organizationId to projects table...");
    await db.execute(sql`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS "organizationId" integer 
      REFERENCES organizations(id) ON DELETE CASCADE
    `);
    console.log("   ✅ Column added\n");

    // 2. Voeg organizationId toe aan safety_incidents
    console.log("2. Adding organizationId to safety_incidents table...");
    await db.execute(sql`
      ALTER TABLE safety_incidents 
      ADD COLUMN IF NOT EXISTS "organizationId" integer 
      REFERENCES organizations(id) ON DELETE SET NULL
    `);
    console.log("   ✅ Column added\n");

    // 3. Voeg defaultOrganizationId toe aan user_preferences
    console.log("3. Adding defaultOrganizationId to user_preferences table...");
    await db.execute(sql`
      ALTER TABLE user_preferences 
      ADD COLUMN IF NOT EXISTS "defaultOrganizationId" integer 
      REFERENCES organizations(id) ON DELETE SET NULL
    `);
    console.log("   ✅ Column added\n");

    // 4. Verdeel projecten over organisaties (random verdeling)
    console.log("4. Distributing projects across organizations...");
    await db.execute(sql`
      UPDATE projects 
      SET "organizationId" = (CASE 
        WHEN MOD(id, 4) = 0 THEN 1
        WHEN MOD(id, 4) = 1 THEN 2
        WHEN MOD(id, 4) = 2 THEN 3
        ELSE 4
      END)
      WHERE "organizationId" IS NULL
    `);
    console.log("   ✅ Projects distributed\n");

    // 5. Update organization naam veld
    console.log("5. Updating organization names in projects...");
    await db.execute(sql`
      UPDATE projects p
      SET organization = o.name
      FROM organizations o
      WHERE p."organizationId" = o.id
      AND (p.organization IS NULL OR p.organization = '')
    `);
    console.log("   ✅ Names updated\n");

    // 6. Update safety incidents via hun project
    console.log("6. Linking safety incidents to organizations...");
    await db.execute(sql`
      UPDATE safety_incidents si
      SET "organizationId" = p."organizationId"
      FROM projects p
      WHERE si."projectId" = p.id
      AND si."organizationId" IS NULL
    `);
    console.log("   ✅ Incidents linked\n");

    // Verificatie
    console.log("📊 Verification:");
    const results = await db.execute(sql`
      SELECT 
        o.name as organization,
        COUNT(DISTINCT p.id) as projects,
        COUNT(DISTINCT si.id) as incidents
      FROM organizations o
      LEFT JOIN projects p ON p."organizationId" = o.id
      LEFT JOIN safety_incidents si ON si."organizationId" = o.id
      GROUP BY o.id, o.name
      ORDER BY o.id
    `);

    results.rows.forEach((row: any) => {
      console.log(`   ${row.organization}: ${row.projects} projects, ${row.incidents} incidents`);
    });

    console.log("\n✅ Schema fixed successfully!");
    console.log("\n💡 You can now:");
    console.log("   - View projects with organizations");
    console.log("   - Manage organizations at /dashboard/admin/organizations");
    console.log("   - Create your admin user at /setup");

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

fixSchema()
  .then(() => {
    console.log("\n✅ Schema fix completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Schema fix failed:", error);
    process.exit(1);
  });

