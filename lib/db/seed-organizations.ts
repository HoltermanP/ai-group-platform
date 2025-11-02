import "dotenv/config";
import { db } from "./index";
import { organizationsTable, projectsTable, userRolesTable, organizationMembersTable } from "./schema";
import { eq, isNull } from "drizzle-orm";

/**
 * Seed script om organisaties aan te maken en bestaande projecten te koppelen
 * Run met: npm run db:seed-orgs
 */

async function seedOrganizations() {
  console.log("🏢 Starting organization seeding...\n");

  try {
    // Stap 1: Maak de 4 organisaties aan
    console.log("📦 Creating organizations...");
    
    const organizationsData = [
      {
        name: "AI Group",
        slug: "ai-group",
        description: "AI Group - Innovatieve infrastructuur oplossingen",
        contactEmail: "info@aigroup.nl",
        website: "https://www.aigroup.nl",
      },
      {
        name: "Van Gelder Groep",
        slug: "van-gelder",
        description: "Van Gelder Groep - Specialist in ondergrondse infrastructuur",
        contactEmail: "contact@vangelder.nl",
        website: "https://www.vangeldergroep.nl",
      },
      {
        name: "HANAB",
        slug: "hanab",
        description: "HANAB - Riolerings- en wegenbouwspecialist",
        contactEmail: "info@hanab.nl",
        website: "https://www.hanab.nl",
      },
      {
        name: "Liander",
        slug: "liander",
        description: "Liander - Netbeheerder elektriciteit en gas",
        contactEmail: "klantenservice@liander.nl",
        website: "https://www.liander.nl",
      },
    ];

    // Dummy admin user ID voor createdBy
    const adminUserId = "user_admin_seed";

    const createdOrgs = [];
    for (const orgData of organizationsData) {
      // Check of organisatie al bestaat
      const existing = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.slug, orgData.slug))
        .limit(1);

      if (existing.length > 0) {
        console.log(`   ⏭️  ${orgData.name} bestaat al (id: ${existing[0].id})`);
        createdOrgs.push(existing[0]);
      } else {
        const [newOrg] = await db
          .insert(organizationsTable)
          .values({
            ...orgData,
            createdBy: adminUserId,
            status: 'active',
          })
          .returning();
        
        console.log(`   ✅ ${orgData.name} aangemaakt (id: ${newOrg.id})`);
        createdOrgs.push(newOrg);
      }
    }

    console.log("\n✅ All organizations created/verified!\n");

    // Stap 2: Haal alle projecten op die nog geen organisatie hebben
    console.log("🔗 Linking projects to organizations...");
    
    const projectsWithoutOrg = await db
      .select()
      .from(projectsTable)
      .where(isNull(projectsTable.organizationId));

    if (projectsWithoutOrg.length === 0) {
      console.log("   ⏭️  All projects already have an organization assigned");
    } else {
      console.log(`   Found ${projectsWithoutOrg.length} projects without organization\n`);

      // Verdeel projecten evenredig over de organisaties
      let orgIndex = 0;
      let updated = 0;

      for (const project of projectsWithoutOrg) {
        const org = createdOrgs[orgIndex % createdOrgs.length];
        
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

      console.log(`\n   ✅ ${updated} projects linked to organizations`);
    }

    // Stap 3: Maak dummy test users aan (voor documentatie doeleinden)
    console.log("\n👥 Test Users Info:");
    console.log("   Note: Test users moeten handmatig via Clerk worden aangemaakt");
    console.log("   Gebruik deze email adressen:");
    console.log("");
    console.log("   1. admin@aigroup.nl       → AI Group (Admin)");
    console.log("   2. manager@vangelder.nl   → Van Gelder Groep (Manager)");
    console.log("   3. project@hanab.nl       → HANAB (Manager)");
    console.log("   4. engineer@liander.nl    → Liander (Member)");
    console.log("");
    console.log("   Na aanmaken in Clerk, kun je ze toevoegen aan organisaties via:");
    console.log("   - Admin dashboard: /dashboard/admin/organizations/[id]");
    console.log("   - Of via SQL met hun Clerk User ID");

    // Samenvatting
    console.log("\n📈 Seeding Summary:");
    console.log(`   • Organizations created: ${createdOrgs.length}`);
    console.log(`   • Projects updated: ${projectsWithoutOrg.length}`);
    console.log("");
    console.log("   Organization distribution:");
    
    for (const org of createdOrgs) {
      const projectCount = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.organizationId, org.id));
      
      console.log(`   - ${org.name}: ${projectCount.length} projects`);
    }

    console.log("\n🎉 Organization seeding completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  }
}

// Run seed functie
seedOrganizations()
  .then(() => {
    console.log("\n✅ Seeding process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding process failed:", error);
    process.exit(1);
  });

