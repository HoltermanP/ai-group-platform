import "dotenv/config";
import { db } from "./index";
import { safetyIncidentsTable, projectsTable } from "./schema";
import { eq, isNotNull, isNull } from "drizzle-orm";

/**
 * Update script om safety incidents te koppelen aan organisaties
 * via hun project koppeling
 */

async function updateIncidentOrganizations() {
  console.log("🔗 Updating safety incidents with organization IDs...\n");

  try {
    // Haal alle incidents op die een project hebben maar nog geen organisatie
    const incidents = await db
      .select({
        incidentId: safetyIncidentsTable.id,
        projectId: safetyIncidentsTable.projectId,
        incidentTitle: safetyIncidentsTable.title,
      })
      .from(safetyIncidentsTable)
      .where(isNotNull(safetyIncidentsTable.projectId));

    console.log(`Found ${incidents.length} incidents linked to projects\n`);

    let updated = 0;
    for (const incident of incidents) {
      if (incident.projectId) {
        // Haal project op om organizationId te krijgen
        const [project] = await db
          .select({ organizationId: projectsTable.organizationId })
          .from(projectsTable)
          .where(eq(projectsTable.id, incident.projectId))
          .limit(1);

        if (project && project.organizationId) {
          await db
            .update(safetyIncidentsTable)
            .set({
              organizationId: project.organizationId,
              updatedAt: new Date(),
            })
            .where(eq(safetyIncidentsTable.id, incident.incidentId));

          updated++;
          console.log(`   ${updated}/${incidents.length}: Incident gekoppeld aan organisatie`);
        }
      }
    }

    console.log(`\n✅ ${updated} incidents updated with organization IDs`);
    console.log("\n🎉 Update completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Error during update:", error);
    throw error;
  }
}

// Run update functie
updateIncidentOrganizations()
  .then(() => {
    console.log("\n✅ Update process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Update process failed:", error);
    process.exit(1);
  });

