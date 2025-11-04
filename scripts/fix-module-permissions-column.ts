import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

/**
 * Fix script om clerkUserld kolom te hernoemen naar clerkUserId
 * 
 * Run met: npx tsx scripts/fix-module-permissions-column.ts
 */
async function fixModulePermissionsColumn() {
  try {
    console.log("🔧 Fix module permissions column name...\n");

    // Check of de tabel bestaat
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_module_permissions'
    `);

    if (tableCheck.rows.length === 0) {
      console.log("⚠️  Tabel user_module_permissions bestaat nog niet. Run eerst: npm run db:push\n");
      return;
    }

    // Check of clerkUserld kolom bestaat (met typo)
    const wrongColumnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_module_permissions' 
      AND column_name = 'clerkUserld'
    `);

    if (wrongColumnCheck.rows.length > 0) {
      console.log("📦 Hernoem clerkUserld naar clerkUserId...");
      
      // Hernoem de kolom
      await db.execute(sql`
        ALTER TABLE "user_module_permissions" 
        RENAME COLUMN "clerkUserld" TO "clerkUserId"
      `);
      
      console.log("   ✅ Kolom succesvol hernoemd\n");
    } else {
      // Check of de correcte kolom al bestaat
      const correctColumnCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_module_permissions' 
        AND column_name = 'clerkUserId'
      `);

      if (correctColumnCheck.rows.length > 0) {
        console.log("   ✅ Kolom clerkUserId bestaat al correct\n");
      } else {
        console.log("   ⚠️  Geen kolom gevonden. Mogelijk moet de tabel opnieuw worden aangemaakt.\n");
      }
    }

    console.log("✨ Fix script succesvol afgerond!\n");
  } catch (error) {
    console.error("❌ Fout bij fix script:", error);
    process.exit(1);
  }
}

// Run het script
fixModulePermissionsColumn()
  .then(() => {
    console.log("✅ Script voltooid");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Onverwachte fout:", error);
    process.exit(1);
  });

