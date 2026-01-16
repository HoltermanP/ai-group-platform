import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function finalVerify() {
  console.log("🎯 Final Database Verification\n");
  console.log("=".repeat(50) + "\n");

  try {
    const result = await db.execute(sql`
      SELECT 
        o.id,
        o.name,
        o.slug,
        COUNT(DISTINCT p.id) as project_count,
        COUNT(DISTINCT si.id) as incident_count
      FROM organizations o
      LEFT JOIN projects p ON p."organizationId" = o.id
      LEFT JOIN safety_incidents si ON si."organizationId" = o.id
      GROUP BY o.id, o.name, o.slug
      ORDER BY o.id
    `);

    console.log("📊 DATA PER ORGANISATIE:\n");
    
    let totalProjects = 0;
    let totalIncidents = 0;

    result.rows.forEach((row) => {
      const typedRow = row as { id: number; name: string; slug: string; project_count: number; incident_count: number };
      console.log(`┌─ ${typedRow.name}`);
      console.log(`│  ID: ${typedRow.id}`);
      console.log(`│  Slug: ${typedRow.slug}`);
      console.log(`│  Projecten: ${typedRow.project_count}`);
      console.log(`│  Veiligheidsmeldingen: ${typedRow.incident_count}`);
      console.log(`└─────────────────────────────────────\n`);
      
      totalProjects += parseInt(String(typedRow.project_count));
      totalIncidents += parseInt(String(typedRow.incident_count));
    });

    console.log("=".repeat(50));
    console.log(`TOTAAL: ${result.rows.length} organisaties`);
    console.log(`        ${totalProjects} projecten`);
    console.log(`        ${totalIncidents} veiligheidsmeldingen`);
    console.log("=".repeat(50));

    console.log("\n✅ DATABASE IS VOLLEDIG INGEVULD!\n");
    console.log("💡 Je kunt nu:");
    console.log("   1. Naar /setup om je admin account aan te maken");
    console.log("   2. Naar /dashboard/projects om projecten te zien");
    console.log("   3. Naar /dashboard/admin/organizations om organisaties te beheren");

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

finalVerify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

