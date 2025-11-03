import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

/**
 * Migratie script om infrastructureType te hernoemen naar discipline
 * en waarden te converteren naar hoofdletters (Elektra, Gas, Water, Media)
 * 
 * Run met: npx tsx scripts/migrate-discipline.ts
 */
async function migrateDiscipline() {
  try {
    console.log("🚀 Start discipline migratie...\n");

    // 1. Projects tabel
    console.log("📦 Migreer projects tabel...");
    
    // Check of infrastructureType kolom bestaat
    const projectsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name = 'infrastructureType'
    `);
    
    if (projectsCheck.rows.length > 0) {
      // Eerst: voeg discipline kolom toe als die nog niet bestaat
      await db.execute(sql`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS discipline varchar(50)
      `);
      
      // Migreer data: converteer oude waarden naar nieuwe
      console.log("   🔄 Converteer data...");
      await db.execute(sql`
        UPDATE projects 
        SET discipline = CASE 
          WHEN "infrastructureType" = 'elektra' THEN 'Elektra'
          WHEN "infrastructureType" = 'gas' THEN 'Gas'
          WHEN "infrastructureType" = 'water' THEN 'Water'
          WHEN "infrastructureType" = 'media' THEN 'Media'
          WHEN "infrastructureType" = 'riool' THEN 'Water'
          WHEN "infrastructureType" = 'telecom' THEN 'Media'
          WHEN "infrastructureType" = 'warmte' THEN 'Gas'
          WHEN "infrastructureType" = 'metro' THEN 'Elektra'
          WHEN "infrastructureType" = 'tunnel' THEN 'Water'
          WHEN "infrastructureType" = 'parkeergarage' THEN NULL
          WHEN "infrastructureType" = 'overig' THEN NULL
          WHEN "infrastructureType" IS NULL THEN NULL
          ELSE 'Elektra'
        END
        WHERE "infrastructureType" IS NOT NULL
      `);
      
      // Verwijder oude kolom
      console.log("   🗑️  Verwijder oude infrastructureType kolom...");
      await db.execute(sql`
        ALTER TABLE projects 
        DROP COLUMN IF EXISTS "infrastructureType"
      `);
      
      console.log("   ✅ Projects tabel gemigreerd\n");
    } else {
      // Check of discipline kolom al bestaat
      const disciplineCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'discipline'
      `);
      
      if (disciplineCheck.rows.length === 0) {
        // Voeg discipline kolom toe als die nog niet bestaat
        await db.execute(sql`
          ALTER TABLE projects 
          ADD COLUMN discipline varchar(50)
        `);
        console.log("   ✅ Discipline kolom toegevoegd aan projects\n");
      } else {
        console.log("   ⚠️  Projects tabel heeft al discipline kolom\n");
      }
    }

    // 2. Safety incidents tabel
    console.log("📦 Migreer safety_incidents tabel...");
    
    // Check of infrastructureType kolom bestaat
    const incidentsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'safety_incidents' 
      AND column_name = 'infrastructureType'
    `);
    
    if (incidentsCheck.rows.length > 0) {
      // Eerst: voeg discipline kolom toe als die nog niet bestaat
      await db.execute(sql`
        ALTER TABLE safety_incidents 
        ADD COLUMN IF NOT EXISTS discipline varchar(100)
      `);
      
      // Migreer data: converteer oude waarden naar nieuwe
      console.log("   🔄 Converteer data...");
      await db.execute(sql`
        UPDATE safety_incidents 
        SET discipline = CASE 
          WHEN "infrastructureType" = 'elektra' THEN 'Elektra'
          WHEN "infrastructureType" = 'gas' THEN 'Gas'
          WHEN "infrastructureType" = 'water' THEN 'Water'
          WHEN "infrastructureType" = 'media' THEN 'Media'
          WHEN "infrastructureType" = 'riool' THEN 'Water'
          WHEN "infrastructureType" = 'telecom' THEN 'Media'
          WHEN "infrastructureType" = 'warmte' THEN 'Gas'
          WHEN "infrastructureType" = 'metro' THEN 'Elektra'
          WHEN "infrastructureType" = 'tunnel' THEN 'Water'
          WHEN "infrastructureType" = 'parkeergarage' THEN NULL
          WHEN "infrastructureType" = 'overig' THEN NULL
          WHEN "infrastructureType" IS NULL THEN NULL
          ELSE 'Elektra'
        END
        WHERE "infrastructureType" IS NOT NULL
      `);
      
      // Verwijder oude kolom
      console.log("   🗑️  Verwijder oude infrastructureType kolom...");
      await db.execute(sql`
        ALTER TABLE safety_incidents 
        DROP COLUMN IF EXISTS "infrastructureType"
      `);
      
      console.log("   ✅ Safety_incidents tabel gemigreerd\n");
    } else {
      // Check of discipline kolom al bestaat
      const disciplineCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'safety_incidents' 
        AND column_name = 'discipline'
      `);
      
      if (disciplineCheck.rows.length === 0) {
        // Voeg discipline kolom toe als die nog niet bestaat
        await db.execute(sql`
          ALTER TABLE safety_incidents 
          ADD COLUMN discipline varchar(100)
        `);
        console.log("   ✅ Discipline kolom toegevoegd aan safety_incidents\n");
      } else {
        console.log("   ⚠️  Safety_incidents tabel heeft al discipline kolom\n");
      }
    }

    // 3. Verificatie
    console.log("📊 Verificatie:");
    const projectsCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM projects
    `);
    const incidentsCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM safety_incidents
    `);
    const disciplineStats = await db.execute(sql`
      SELECT discipline, COUNT(*) as count 
      FROM projects 
      WHERE discipline IS NOT NULL
      GROUP BY discipline
      ORDER BY discipline
    `);
    
    console.log(`   • ${projectsCount.rows[0]?.count || 0} projecten`);
    console.log(`   • ${incidentsCount.rows[0]?.count || 0} veiligheidsmeldingen`);
    
    if (disciplineStats.rows.length > 0) {
      console.log("\n   Discipline distributie in projecten:");
      disciplineStats.rows.forEach((row: any) => {
        console.log(`     - ${row.discipline}: ${row.count}`);
      });
    }

    console.log("\n✨ Migratie succesvol afgerond!");
    console.log("\n💡 Tip: Run 'npm run db:seed' of 'npm run db:seed-orgs' om nieuwe data te genereren");
    
  } catch (error) {
    console.error("\n❌ Fout bij migratie:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrateDiscipline();

