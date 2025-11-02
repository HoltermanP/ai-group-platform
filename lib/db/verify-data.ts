import "dotenv/config";
import { db } from "./index";
import { organizationsTable, projectsTable, safetyIncidentsTable, userRolesTable } from "./schema";
import { isNotNull } from "drizzle-orm";

/**
 * Verificatie script om te checken welke data er in de database zit
 */

async function verifyData() {
  console.log("🔍 Verifying database data...\n");

  try {
    // Check organizations
    console.log("📊 Organizations:");
    const orgs = await db.select().from(organizationsTable);
    console.log(`   Found ${orgs.length} organizations`);
    orgs.forEach(org => {
      console.log(`   - ${org.name} (id: ${org.id}, slug: ${org.slug})`);
    });

    // Check projects
    console.log("\n📊 Projects:");
    const projects = await db.select().from(projectsTable);
    console.log(`   Found ${projects.length} total projects`);
    
    const projectsWithOrg = await db
      .select()
      .from(projectsTable)
      .where(isNotNull(projectsTable.organizationId));
    console.log(`   - ${projectsWithOrg.length} projects with organizationId`);
    
    const projectsWithOrgName = await db
      .select()
      .from(projectsTable)
      .where(isNotNull(projectsTable.organization));
    console.log(`   - ${projectsWithOrgName.length} projects with organization name`);

    // Check safety incidents
    console.log("\n📊 Safety Incidents:");
    const incidents = await db.select().from(safetyIncidentsTable);
    console.log(`   Found ${incidents.length} total incidents`);
    
    const incidentsWithOrg = await db
      .select()
      .from(safetyIncidentsTable)
      .where(isNotNull(safetyIncidentsTable.organizationId));
    console.log(`   - ${incidentsWithOrg.length} incidents with organizationId`);

    // Check user roles
    console.log("\n📊 User Roles:");
    const roles = await db.select().from(userRolesTable);
    console.log(`   Found ${roles.length} users with roles`);
    roles.forEach(role => {
      console.log(`   - ${role.clerkUserId}: ${role.role}`);
    });

    // Detailed breakdown per organization
    console.log("\n📊 Breakdown per Organization:");
    for (const org of orgs) {
      const orgProjects = projectsWithOrg.filter(p => p.organizationId === org.id);
      const orgIncidents = incidentsWithOrg.filter(i => i.organizationId === org.id);
      console.log(`   ${org.name}:`);
      console.log(`     - ${orgProjects.length} projects`);
      console.log(`     - ${orgIncidents.length} incidents`);
    }

    console.log("\n✅ Verification completed!");
    
  } catch (error) {
    console.error("\n❌ Error during verification:", error);
    throw error;
  }
}

// Run verificatie functie
verifyData()
  .then(() => {
    console.log("\n✅ Verification process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Verification process failed:", error);
    process.exit(1);
  });

