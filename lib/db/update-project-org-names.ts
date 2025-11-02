import "dotenv/config";
import { db } from "./index";
import { projectsTable, organizationsTable } from "./schema";
import { eq, isNotNull } from "drizzle-orm";

/**
 * Update script om de organization naam kolom te vullen
 * op basis van de organizationId
 */

async function updateProjectOrganizationNames() {
  console.log("📝 Updating project organization names...\n");

  try {
    // Haal alle projecten op die een organizationId hebben
    const projects = await db
      .select({
        id: projectsTable.id,
        name: projectsTable.name,
        organizationId: projectsTable.organizationId,
      })
      .from(projectsTable)
      .where(isNotNull(projectsTable.organizationId));

    console.log(`Found ${projects.length} projects with organization ID\n`);

    let updated = 0;
    for (const project of projects) {
      if (project.organizationId) {
        // Haal organisatie naam op
        const [org] = await db
          .select({ name: organizationsTable.name })
          .from(organizationsTable)
          .where(eq(organizationsTable.id, project.organizationId))
          .limit(1);

        if (org) {
          await db
            .update(projectsTable)
            .set({
              organization: org.name,
              updatedAt: new Date(),
            })
            .where(eq(projectsTable.id, project.id));

          updated++;
          console.log(`   ${updated}/${projects.length}: "${project.name}" → ${org.name}`);
        }
      }
    }

    console.log(`\n✅ ${updated} projects updated with organization names`);
    console.log("\n🎉 Update completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Error during update:", error);
    throw error;
  }
}

// Run update functie
updateProjectOrganizationNames()
  .then(() => {
    console.log("\n✅ Update process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Update process failed:", error);
    process.exit(1);
  });

