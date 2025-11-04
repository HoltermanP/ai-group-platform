import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

/**
 * Check script om kolomnamen te controleren
 */
async function checkTable() {
  try {
    console.log("🔍 Controleer user_module_permissions tabel...\n");

    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_module_permissions'
      ORDER BY ordinal_position
    `);

    console.log("Kolommen in user_module_permissions:");
    console.log("=====================================");
    columns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    console.log("\n");

    // Check specifiek voor clerkUserId en clerkUserld
    const clerkUserIdCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_module_permissions' 
      AND column_name IN ('clerkUserId', 'clerkUserld')
    `);

    console.log("Gevonden kolommen met clerkUser:");
    clerkUserIdCheck.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}`);
    });

  } catch (error) {
    console.error("❌ Fout:", error);
  }
}

checkTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

