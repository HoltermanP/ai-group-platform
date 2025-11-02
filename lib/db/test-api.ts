import "dotenv/config";
import { db } from "./index";
import { projectsTable, organizationsTable } from "./schema";
import { eq, sql } from "drizzle-orm";

/**
 * Test om te zien of de projecten data correct is
 */

async function testProjectsData() {
  console.log("🧪 Testing Projects Data\n");

  try {
    // Test 1: Haal eerste 5 projecten op zoals de API dat doet
    console.log("1️⃣ Testing API-style query...\n");
    
    const projects = await db
      .select({
        id: projectsTable.id,
        projectId: projectsTable.projectId,
        name: projectsTable.name,
        organizationId: projectsTable.organizationId,
        status: projectsTable.status,
      })
      .from(projectsTable)
      .limit(5);

    console.log(`Found ${projects.length} projects:`);
    projects.forEach(p => {
      console.log(`   - ${p.name}`);
      console.log(`     ID: ${p.id}, Project ID: ${p.projectId}`);
      console.log(`     Organization ID: ${p.organizationId}`);
      console.log(`     Status: ${p.status}\n`);
    });

    // Test 2: Haal projecten met organisatie namen op
    console.log("\n2️⃣ Testing projects with organization names...\n");
    
    const projectsWithOrg = await db
      .select({
        projectName: projectsTable.name,
        orgId: projectsTable.organizationId,
        orgName: organizationsTable.name,
      })
      .from(projectsTable)
      .leftJoin(organizationsTable, eq(projectsTable.organizationId, organizationsTable.id))
      .limit(5);

    console.log(`Found ${projectsWithOrg.length} projects with org names:`);
    projectsWithOrg.forEach(p => {
      console.log(`   - ${p.projectName} → ${p.orgName || 'Geen organisatie'}`);
    });

    console.log("\n✅ API data test completed successfully!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

testProjectsData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

