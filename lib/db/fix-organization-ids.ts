import "dotenv/config";
import { db } from "./index";
import { organizationsTable, projectsTable, safetyIncidentsTable, toolboxesTable } from "./schema";
import { eq, isNull, sql } from "drizzle-orm";

/**
 * Script om alle testdata te koppelen aan organisaties
 * Zorgt ervoor dat alle projecten, safety incidents en toolboxes een organizationId hebben
 * Run met: npm run db:fix-orgs
 */

async function fixOrganizationIds() {
  console.log("🔧 Fixing organization IDs for all test data...\n");

  try {
    // Stap 1: Haal alle organisaties op
    console.log("1. Fetching organizations...");
    const organizations = await db
      .select()
      .from(organizationsTable);

    if (organizations.length === 0) {
      console.error("❌ Geen organisaties gevonden! Voer eerst seed-organizations.ts uit.");
      process.exit(1);
    }

    console.log(`   ✅ ${organizations.length} organisaties gevonden:\n`);
    organizations.forEach((org) => {
      console.log(`      - ${org.name} (id: ${org.id})`);
    });
    console.log("");

    // Stap 2: Fix projecten zonder organizationId
    console.log("2. Fixing projects without organizationId...");
    const projectsWithoutOrg = await db
      .select()
      .from(projectsTable)
      .where(isNull(projectsTable.organizationId));

    if (projectsWithoutOrg.length === 0) {
      console.log("   ✅ Alle projecten hebben al een organizationId\n");
    } else {
      console.log(`   Found ${projectsWithoutOrg.length} projects without organizationId\n`);

      let orgIndex = 0;
      let updated = 0;

      for (const project of projectsWithoutOrg) {
        const org = organizations[orgIndex % organizations.length];

        await db
          .update(projectsTable)
          .set({
            organizationId: org.id,
            updatedAt: new Date(),
          })
          .where(eq(projectsTable.id, project.id));

        updated++;
        console.log(`   ${updated}/${projectsWithoutOrg.length}: "${project.name}" → ${org.name}`);

        orgIndex++;
      }

      console.log(`\n   ✅ ${updated} projects linked to organizations\n`);
    }

    // Stap 3: Fix safety incidents zonder organizationId
    console.log("3. Fixing safety incidents without organizationId...");
    
    // Haal alle incidents op die geen organizationId hebben maar wel een projectId
    const incidentsWithoutOrg = await db
      .select({
        id: safetyIncidentsTable.id,
        incidentId: safetyIncidentsTable.incidentId,
        projectId: safetyIncidentsTable.projectId,
      })
      .from(safetyIncidentsTable)
      .where(isNull(safetyIncidentsTable.organizationId));

    if (incidentsWithoutOrg.length === 0) {
      console.log("   ✅ Alle safety incidents hebben al een organizationId\n");
    } else {
      console.log(`   Found ${incidentsWithoutOrg.length} incidents without organizationId\n`);

      let updated = 0;
      let skipped = 0;

      for (const incident of incidentsWithoutOrg) {
        if (!incident.projectId) {
          // Als incident geen project heeft, kies een willekeurige organisatie
          const org = organizations[Math.floor(Math.random() * organizations.length)];
          await db
            .update(safetyIncidentsTable)
            .set({
              organizationId: org.id,
              updatedAt: new Date(),
            })
            .where(eq(safetyIncidentsTable.id, incident.id));
          
          updated++;
          console.log(`   ${updated}/${incidentsWithoutOrg.length}: "${incident.incidentId}" (geen project) → ${org.name}`);
        } else {
          // Haal het project op om de organizationId te krijgen
          const project = await db
            .select({
              id: projectsTable.id,
              organizationId: projectsTable.organizationId,
              name: projectsTable.name,
            })
            .from(projectsTable)
            .where(eq(projectsTable.id, incident.projectId))
            .limit(1);

          if (project.length > 0 && project[0].organizationId) {
            await db
              .update(safetyIncidentsTable)
              .set({
                organizationId: project[0].organizationId,
                updatedAt: new Date(),
              })
              .where(eq(safetyIncidentsTable.id, incident.id));

            updated++;
            console.log(`   ${updated}/${incidentsWithoutOrg.length}: "${incident.incidentId}" → ${project[0].name} (org: ${project[0].organizationId})`);
          } else {
            // Project heeft zelf geen organizationId, kies een willekeurige
            const org = organizations[Math.floor(Math.random() * organizations.length)];
            await db
              .update(safetyIncidentsTable)
              .set({
                organizationId: org.id,
                updatedAt: new Date(),
              })
              .where(eq(safetyIncidentsTable.id, incident.id));

            updated++;
            skipped++;
            console.log(`   ${updated}/${incidentsWithoutOrg.length}: "${incident.incidentId}" (project zonder org) → ${org.name}`);
          }
        }
      }

      console.log(`\n   ✅ ${updated} incidents linked to organizations`);
      if (skipped > 0) {
        console.log(`   ⚠️  ${skipped} incidents hadden projecten zonder organizationId`);
      }
      console.log("");
    }

    // Stap 4: Fix toolboxes zonder organizationId
    console.log("4. Fixing toolboxes without organizationId...");
    
    const toolboxesWithoutOrg = await db
      .select({
        id: toolboxesTable.id,
        toolboxId: toolboxesTable.toolboxId,
        projectId: toolboxesTable.projectId,
      })
      .from(toolboxesTable)
      .where(isNull(toolboxesTable.organizationId));

    if (toolboxesWithoutOrg.length === 0) {
      console.log("   ✅ Alle toolboxes hebben al een organizationId\n");
    } else {
      console.log(`   Found ${toolboxesWithoutOrg.length} toolboxes without organizationId\n`);

      let updated = 0;
      let skipped = 0;

      for (const toolbox of toolboxesWithoutOrg) {
        if (!toolbox.projectId) {
          // Als toolbox geen project heeft, kies een willekeurige organisatie
          const org = organizations[Math.floor(Math.random() * organizations.length)];
          await db
            .update(toolboxesTable)
            .set({
              organizationId: org.id,
              updatedAt: new Date(),
            })
            .where(eq(toolboxesTable.id, toolbox.id));
          
          updated++;
          console.log(`   ${updated}/${toolboxesWithoutOrg.length}: "${toolbox.toolboxId}" (geen project) → ${org.name}`);
        } else {
          // Haal het project op om de organizationId te krijgen
          const project = await db
            .select({
              id: projectsTable.id,
              organizationId: projectsTable.organizationId,
              name: projectsTable.name,
            })
            .from(projectsTable)
            .where(eq(projectsTable.id, toolbox.projectId))
            .limit(1);

          if (project.length > 0 && project[0].organizationId) {
            await db
              .update(toolboxesTable)
              .set({
                organizationId: project[0].organizationId,
                updatedAt: new Date(),
              })
              .where(eq(toolboxesTable.id, toolbox.id));

            updated++;
            console.log(`   ${updated}/${toolboxesWithoutOrg.length}: "${toolbox.toolboxId}" → ${project[0].name} (org: ${project[0].organizationId})`);
          } else {
            // Project heeft zelf geen organizationId, kies een willekeurige
            const org = organizations[Math.floor(Math.random() * organizations.length)];
            await db
              .update(toolboxesTable)
              .set({
                organizationId: org.id,
                updatedAt: new Date(),
              })
              .where(eq(toolboxesTable.id, toolbox.id));

            updated++;
            skipped++;
            console.log(`   ${updated}/${toolboxesWithoutOrg.length}: "${toolbox.toolboxId}" (project zonder org) → ${org.name}`);
          }
        }
      }

      console.log(`\n   ✅ ${updated} toolboxes linked to organizations`);
      if (skipped > 0) {
        console.log(`   ⚠️  ${skipped} toolboxes hadden projecten zonder organizationId`);
      }
      console.log("");
    }

    // Stap 5: Verificatie - check of alles nu een organizationId heeft
    console.log("5. Verifying all data has organizationId...\n");

    const projectsCheck = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectsTable)
      .where(isNull(projectsTable.organizationId));

    const incidentsCheck = await db
      .select({ count: sql<number>`count(*)` })
      .from(safetyIncidentsTable)
      .where(isNull(safetyIncidentsTable.organizationId));

    const toolboxesCheck = await db
      .select({ count: sql<number>`count(*)` })
      .from(toolboxesTable)
      .where(isNull(toolboxesTable.organizationId));

    const projectsWithoutOrgCount = Number(projectsCheck[0]?.count || 0);
    const incidentsWithoutOrgCount = Number(incidentsCheck[0]?.count || 0);
    const toolboxesWithoutOrgCount = Number(toolboxesCheck[0]?.count || 0);

    if (projectsWithoutOrgCount === 0 && incidentsWithoutOrgCount === 0 && toolboxesWithoutOrgCount === 0) {
      console.log("   ✅ Alle testdata heeft nu een organizationId!\n");
    } else {
      console.log("   ⚠️  Er zijn nog items zonder organizationId:");
      if (projectsWithoutOrgCount > 0) {
        console.log(`      - ${projectsWithoutOrgCount} projecten`);
      }
      if (incidentsWithoutOrgCount > 0) {
        console.log(`      - ${incidentsWithoutOrgCount} safety incidents`);
      }
      if (toolboxesWithoutOrgCount > 0) {
        console.log(`      - ${toolboxesWithoutOrgCount} toolboxes`);
      }
      console.log("");
    }

    // Samenvatting
    console.log("📈 Samenvatting:");
    
    const totalProjects = await db.select({ count: sql<number>`count(*)` }).from(projectsTable);
    const totalIncidents = await db.select({ count: sql<number>`count(*)` }).from(safetyIncidentsTable);
    const totalToolboxes = await db.select({ count: sql<number>`count(*)` }).from(toolboxesTable);

    console.log(`   • Totaal projecten: ${totalProjects[0]?.count || 0}`);
    console.log(`   • Totaal safety incidents: ${totalIncidents[0]?.count || 0}`);
    console.log(`   • Totaal toolboxes: ${totalToolboxes[0]?.count || 0}`);
    console.log("");

    // Toon verdeling per organisatie
    console.log("   Organisatie verdeling:");
    for (const org of organizations) {
      const projectCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(projectsTable)
        .where(eq(projectsTable.organizationId, org.id));
      
      const incidentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(safetyIncidentsTable)
        .where(eq(safetyIncidentsTable.organizationId, org.id));
      
      const toolboxCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(toolboxesTable)
        .where(eq(toolboxesTable.organizationId, org.id));

      console.log(`   - ${org.name}:`);
      console.log(`     • ${projectCount[0]?.count || 0} projecten`);
      console.log(`     • ${incidentCount[0]?.count || 0} safety incidents`);
      console.log(`     • ${toolboxCount[0]?.count || 0} toolboxes`);
    }

    console.log("\n🎉 Fix organization IDs completed successfully!");

  } catch (error) {
    console.error("\n❌ Error during fixing:", error);
    throw error;
  }
}

// Run fix functie
fixOrganizationIds()
  .then(() => {
    console.log("\n✅ Fix process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fix process failed:", error);
    process.exit(1);
  });

