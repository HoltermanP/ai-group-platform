import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Simpele verificatie met SQL queries
 */

async function simpleVerify() {
  console.log("🔍 Database Status Check\n");

  try {
    // Organizations
    const orgs = await db.execute(sql`
      SELECT id, name, slug 
      FROM organizations 
      ORDER BY id
    `);
    console.log("📊 Organizations:");
    console.log(`   Total: ${orgs.rows.length}`);
    orgs.rows.forEach((org) => {
      const typedOrg = org as { id: number; name: string; slug: string };
      console.log(`   - ${typedOrg.name} (id: ${typedOrg.id})`);
    });

    // Projects met organization
    const projects = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(organizationId) as with_org_id,
        COUNT(organization) as with_org_name
      FROM projects
    `);
    console.log("\n📊 Projects:");
    const p = projects.rows[0] as Record<string, unknown>;
    const typedP = {
      total: p.total as number,
      with_org_id: p.with_org_id as number,
      with_org_name: p.with_org_name as number
    };
    console.log(`   Total: ${typedP.total}`);
    console.log(`   With organizationId: ${typedP.with_org_id}`);
    console.log(`   With organization name: ${typedP.with_org_name}`);

    // Projects per org
    const projectsPerOrg = await db.execute(sql`
      SELECT 
        o.name as org_name,
        COUNT(p.id) as project_count
      FROM organizations o
      LEFT JOIN projects p ON p.organizationId = o.id
      GROUP BY o.id, o.name
      ORDER BY o.id
    `);
    console.log("\n📊 Projects per Organization:");
    projectsPerOrg.rows.forEach((row) => {
      const typedRow = row as { org_name: string; project_count: number };
      console.log(`   ${typedRow.org_name}: ${typedRow.project_count} projects`);
    });

    // Safety incidents
    const incidents = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(organizationId) as with_org
      FROM safety_incidents
    `);
    const i = incidents.rows[0] as Record<string, unknown>;
    const typedI = {
      total: i.total as number,
      with_org: i.with_org as number
    };
    console.log("\n📊 Safety Incidents:");
    console.log(`   Total: ${typedI.total}`);
    console.log(`   With organizationId: ${typedI.with_org}`);

    // User roles
    const roles = await db.execute(sql`
      SELECT role, COUNT(*) as count
      FROM user_roles
      GROUP BY role
    `);
    console.log("\n📊 User Roles:");
    if (roles.rows.length === 0) {
      console.log(`   No users with roles yet`);
    } else {
      roles.rows.forEach((row) => {
        const typedRow = row as { role: string; count: number };
        console.log(`   ${typedRow.role}: ${typedRow.count} user(s)`);
      });
    }

    console.log("\n✅ Database is properly set up!");
    console.log("\n💡 Next steps:");
    console.log("   1. Go to /setup to create your first admin user");
    console.log("   2. View organizations at /dashboard/admin/organizations");
    console.log("   3. View projects at /dashboard/projects");
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

simpleVerify()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

