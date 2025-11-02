import "dotenv/config";
import { db } from "./index";
import { projectsTable, safetyIncidentsTable } from "./schema";
import { sql } from "drizzle-orm";

/**
 * Update script voor realistische ondergrondse infrastructuur data
 */

const infrastructureProjects = [
  // ELEKTRA - AI Group
  {
    projectId: "EL-2024-001",
    name: "Sanering 10kV Kabelnet Centrum",
    category: "sanering",
    infrastructureType: "elektra",
    organizationId: 1,
    description: "Sanering van verouderd 10kV middenspanningsnet in het centrum. Vervanging van oude papier-olie kabels door XLPE kabels.",
    projectManager: "Ing. J. van der Berg",
    budget: 85000000, // 850k
  },
  {
    projectId: "EL-2024-002",
    name: "Reconstructie Laagspanningsnet Noord",
    category: "reconstructie",
    infrastructureType: "elektra",
    organizationId: 1,
    description: "Vernieuwing van het laagspanningsnet inclusief nieuwe transformatorstations en kabelinfrastructuur.",
    projectManager: "Ing. M. Jansen",
    budget: 125000000, // 1.25M
  },
  
  // GAS - Van Gelder Groep
  {
    projectId: "GAS-2024-001",
    name: "Sanering Gietijzeren Gasleidingen Zuid",
    category: "sanering",
    infrastructureType: "gas",
    organizationId: 2,
    description: "Verwijdering van oude gietijzeren gasleidingen en vervanging door PE leidingen conform NEN 3650.",
    projectManager: "Ir. P. de Vries",
    budget: 95000000, // 950k
  },
  {
    projectId: "GAS-2024-002",
    name: "Nieuwe Aanleg Gastracé Bedrijventerrein",
    category: "nieuwe-aanleg",
    infrastructureType: "gas",
    organizationId: 2,
    description: "Aanleg nieuw middendruk gastransportnet voor nieuw bedrijventerrein inclusief drukregelinstallaties.",
    projectManager: "Ing. E. Bakker",
    budget: 180000000, // 1.8M
  },
  {
    projectId: "GAS-2024-003",
    name: "Reconstructie Gasnet Woonwijk Oost",
    category: "reconstructie",
    infrastructureType: "gas",
    organizationId: 2,
    description: "Vernieuwing van het gehele gasnetwerk in bestaande woonwijk, inclusief huisaansluitingen.",
    projectManager: "Ir. T. Visser",
    budget: 145000000, // 1.45M
  },
  
  // WATER - HANAB
  {
    projectId: "WAT-2024-001",
    name: "Sanering Asbestcement Waterleiding",
    category: "sanering",
    infrastructureType: "water",
    organizationId: 3,
    description: "Verwijdering en vervanging van asbestcement waterleidingen door gietijzer met PE coating.",
    projectManager: "Ir. S. Smit",
    budget: 115000000, // 1.15M
  },
  {
    projectId: "WAT-2024-002",
    name: "Nieuwe Aanleg Transportleiding DN600",
    category: "nieuwe-aanleg",
    infrastructureType: "water",
    organizationId: 3,
    description: "Aanleg nieuwe hoofdtransportleiding DN600 over 8km voor verbinding tussen pompstations.",
    projectManager: "Ir. L. de Jong",
    budget: 320000000, // 3.2M
  },
  {
    projectId: "WAT-2024-003",
    name: "Reconstructie Drinkwaternet Centrum",
    category: "reconstructie",
    infrastructureType: "water",
    organizationId: 3,
    description: "Vernieuwing drinkwaterdistributienet inclusief vervanging afsluiterkasten en brandkranen.",
    projectManager: "Ing. A. Hendriks",
    budget: 98000000, // 980k
  },
  
  // MEDIA (Telecom/Data) - Liander  
  {
    projectId: "MED-2024-001",
    name: "Nieuwe Aanleg Glasvezelnetwerk",
    category: "nieuwe-aanleg",
    infrastructureType: "media",
    organizationId: 4,
    description: "Aanleg Fiber-to-the-Home netwerk in 4 wijken, inclusief buisleidingen en coax vervanging.",
    projectManager: "Ing. M. Vermeulen",
    budget: 156000000, // 1.56M
  },
  {
    projectId: "MED-2024-002",
    name: "Reconstructie Telecomkabelnet",
    category: "reconstructie",
    infrastructureType: "media",
    organizationId: 4,
    description: "Vernieuwing van verouderd koperen telecomnetwerk naar fiber infrastructuur.",
    projectManager: "Ir. L. Dijkstra",
    budget: 89000000, // 890k
  },
  
  // ELEKTRA - Van Gelder Groep
  {
    projectId: "EL-2024-003",
    name: "Nieuwe Aanleg HS Station 150kV",
    category: "nieuwe-aanleg",
    infrastructureType: "elektra",
    organizationId: 2,
    description: "Realisatie nieuw hoogspanningsstation 150/10kV inclusief kabelverbindingen en grondkabels.",
    projectManager: "Ir. J. Bakker",
    budget: 485000000, // 4.85M
  },
  {
    projectId: "EL-2024-004",
    name: "Sanering Ondergrondse Kabelgoten",
    category: "sanering",
    infrastructureType: "elektra",
    organizationId: 2,
    description: "Verwijdering van oude asbestcementbuizen en vervanging door kunststof kabelgoten.",
    projectManager: "Ing. R. Peters",
    budget: 67000000, // 670k
  },
  
  // GAS - HANAB
  {
    projectId: "GAS-2024-004",
    name: "Reconstructie Gasdrukregelstation",
    category: "reconstructie",
    infrastructureType: "gas",
    organizationId: 3,
    description: "Modernisering van 3 gasdrukregelstations inclusief nieuwe meet- en regelapparatuur.",
    projectManager: "Ir. K. Visser",
    budget: 235000000, // 2.35M
  },
  {
    projectId: "GAS-2024-005",
    name: "Nieuwe Aanleg Gastracé Ringweg",
    category: "nieuwe-aanleg",
    infrastructureType: "gas",
    organizationId: 3,
    description: "Aanleg nieuwe gasleiding DN400 langs nieuwe ringweg ter ontlasting bestaand net.",
    projectManager: "Ing. F. de Boer",
    budget: 198000000, // 1.98M
  },
  
  // WATER - Liander
  {
    projectId: "WAT-2024-004",
    name: "Sanering Loden Leidingen Binnenstad",
    category: "sanering",
    infrastructureType: "water",
    organizationId: 4,
    description: "Verwijdering laatste loden waterleidingen in historische binnenstad, relining waar mogelijk.",
    projectManager: "Ir. D. Mulder",
    budget: 78000000, // 780k
  },
  {
    projectId: "WAT-2024-005",
    name: "Reconstructie Pompstation Zuid",
    category: "reconstructie",
    infrastructureType: "water",
    organizationId: 4,
    description: "Complete vernieuwing pompstation inclusief nieuwe pompen, aandrijvingen en besturing.",
    projectManager: "Ing. N. Bos",
    budget: 425000000, // 4.25M
  },
  
  // MEDIA - AI Group
  {
    projectId: "MED-2024-003",
    name: "Sanering Verouderd Coax Netwerk",
    category: "sanering",
    infrastructureType: "media",
    organizationId: 1,
    description: "Verwijdering oud coaxnetwerk uit jaren '80 en vervanging door fiber infrastructuur.",
    projectManager: "Ir. C. van Dam",
    budget: 92000000, // 920k
  },
  {
    projectId: "MED-2024-004",
    name: "Nieuwe Aanleg Data Center Backbone",
    category: "nieuwe-aanleg",
    infrastructureType: "media",
    organizationId: 1,
    description: "Aanleg redundante fiber verbindingen tussen 4 datacenters met 400Gbit capaciteit.",
    projectManager: "Ir. H. Smits",
    budget: 356000000, // 3.56M
  },
  
  // Extra projecten voor variatie
  {
    projectId: "EL-2024-005",
    name: "Reconstructie Openbare Verlichting",
    category: "reconstructie",
    infrastructureType: "elektra",
    organizationId: 1,
    description: "Vervanging conventionele verlichting door LED inclusief diminstallaties en nieuwe kabels.",
    projectManager: "Ing. W. Jansen",
    budget: 54000000, // 540k
  },
  {
    projectId: "GAS-2024-006",
    name: "Sanering Oudste Gietijzer Tracés",
    category: "sanering",
    infrastructureType: "gas",
    organizationId: 2,
    description: "Verwijdering gietijzeren gasleidingen uit 1920-1950 in historische wijken.",
    projectManager: "Ir. B. Koster",
    budget: 134000000, // 1.34M
  },
  {
    projectId: "WAT-2024-006",
    name: "Nieuwe Aanleg Grondwaterinfiltratiesysteem",
    category: "nieuwe-aanleg",
    infrastructureType: "water",
    organizationId: 3,
    description: "Realisatie nieuwe infiltratievijvers en leidingwerk voor grondwateraanvulling.",
    projectManager: "Ir. G. Prins",
    budget: 287000000, // 2.87M
  },
  {
    projectId: "MED-2024-005",
    name: "Reconstructie 5G Antenne Backbone",
    category: "reconstructie",
    infrastructureType: "media",
    organizationId: 4,
    description: "Aanpassing bestaande fiber infrastructuur voor 5G antenne-sites, 200+ locaties.",
    projectManager: "Ing. Y. Vermeer",
    budget: 175000000, // 1.75M
  },
  {
    projectId: "EL-2024-006",
    name: "Nieuwe Aanleg Laadinfrastructuur",
    category: "nieuwe-aanleg",
    infrastructureType: "elektra",
    organizationId: 2,
    description: "Aanleg nieuw kabelnetwerk voor 500 publieke laadpalen elektrische voertuigen.",
    projectManager: "Ir. Q. de Wit",
    budget: 186000000, // 1.86M
  },
  {
    projectId: "GAS-2024-007",
    name: "Reconstructie Transportleiding DN300",
    category: "reconstructie",
    infrastructureType: "gas",
    organizationId: 3,
    description: "Vernieuwing 12km gastransportleiding inclusief nieuwe beschermingsbuizen en coating.",
    projectManager: "Ing. U. Meijer",
    budget: 256000000, // 2.56M
  },
  {
    projectId: "WAT-2024-007",
    name: "Sanering PVC Rioolpersleiding",
    category: "sanering",
    infrastructureType: "water",
    organizationId: 1,
    description: "Vervanging oude PVC rioolpersleidingen door PE leidingen met betere duurzaamheid.",
    projectManager: "Ir. I. Koning",
    budget: 112000000, // 1.12M
  },
  {
    projectId: "MED-2024-006",
    name: "Nieuwe Aanleg Smart City Netwerk",
    category: "nieuwe-aanleg",
    infrastructureType: "media",
    organizationId: 1,
    description: "Realisatie IoT sensor netwerk inclusief fiber verbindingen en LoRaWAN gateways.",
    projectManager: "Ir. O. Berg",
    budget: 143000000, // 1.43M
  },
  {
    projectId: "EL-2024-007",
    name: "Sanering Bovengrondse Lijnvoering",
    category: "sanering",
    infrastructureType: "elektra",
    organizationId: 3,
    description: "Ondergronds brengen van bovengrondse middenspanningsleidingen in woonwijken.",
    projectManager: "Ing. V. Dekker",
    budget: 298000000, // 2.98M
  },
  {
    projectId: "GAS-2024-008",
    name: "Nieuwe Aanleg Waterstof Ready Leidingen",
    category: "nieuwe-aanleg",
    infrastructureType: "gas",
    organizationId: 4,
    description: "Aanleg toekomstbestendig leidingennet geschikt voor waterstof transport.",
    projectManager: "Ir. Z. Scholten",
    budget: 412000000, // 4.12M
  },
  {
    projectId: "WAT-2024-008",
    name: "Reconstructie Rioolgemaal Stations",
    category: "reconstructie",
    infrastructureType: "water",
    organizationId: 4,
    description: "Modernisering 8 rioolgemaalstations met nieuwe pompen en telemetrie systemen.",
    projectManager: "Ing. X. Brouwer",
    budget: 167000000, // 1.67M
  },
  {
    projectId: "MED-2024-007",
    name: "Sanering Koperen Telefoonnet",
    category: "sanering",
    infrastructureType: "media",
    organizationId: 2,
    description: "Definitieve verwijdering oude koperen telefoonkabels en vrijmaken tracés.",
    projectManager: "Ir. A. Willems",
    budget: 45000000, // 450k
  },
];

async function updateInfraData() {
  console.log("🔧 Updating database with realistic infrastructure data...\n");

  try {
    // Stap 1: Voeg nieuwe kolommen toe
    console.log("1. Adding new columns to projects table...");
    try {
      await db.execute(sql`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS category varchar(50)
      `);
      await db.execute(sql`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS "infrastructureType" varchar(50)
      `);
      console.log("   ✅ Columns added\n");
    } catch (error) {
      console.log("   ⚠️  Columns might already exist, continuing...\n");
    }

    // Stap 2: Verwijder alle bestaande projecten EN incidenten
    console.log("2. Clearing existing data...");
    await db.execute(sql`DELETE FROM safety_incidents`);
    await db.execute(sql`DELETE FROM projects`);
    console.log("   ✅ Old data removed\n");

    // Stap 3: Voeg nieuwe projecten toe
    console.log("3. Inserting new infrastructure projects...");
    let count = 0;
    for (const project of infrastructureProjects) {
      // Genereer realistische datums
      const startDate = new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 6 + Math.floor(Math.random() * 18)); // 6-24 maanden

      await db.execute(sql`
        INSERT INTO projects (
          "projectId", name, description, status, "organizationId",
          category, "infrastructureType", "projectManager",
          "startDate", "plannedEndDate", budget, currency, "ownerId"
        ) VALUES (
          ${project.projectId},
          ${project.name},
          ${project.description},
          ${Math.random() > 0.2 ? 'active' : Math.random() > 0.5 ? 'on-hold' : 'completed'},
          ${project.organizationId},
          ${project.category},
          ${project.infrastructureType},
          ${project.projectManager},
          ${startDate.toISOString()},
          ${endDate.toISOString()},
          ${project.budget},
          'EUR',
          'user_seed_admin'
        )
      `);
      count++;
      process.stdout.write(`\r   Progress: ${count}/${infrastructureProjects.length}`);
    }
    console.log("\n   ✅ Projects inserted\n");

    // Stap 4: Haal nieuwe project IDs op
    console.log("4. Generating realistic safety incidents...");
    const projects = await db.execute(sql`
      SELECT id, "projectId", "infrastructureType", category
      FROM projects
      LIMIT 15
    `);

    // Voeg incidenten toe aan eerste 15 projecten
    let incidentCount = 0;
    for (const project of projects.rows) {
      const numIncidents = 2 + Math.floor(Math.random() * 4); // 2-5 incidenten per project
      
      for (let i = 0; i < numIncidents; i++) {
        incidentCount++;
        const incident = generateInfraIncident(project as any, incidentCount);
        
        await db.execute(sql`
          INSERT INTO safety_incidents (
            "incidentId", title, description, category, severity, status, priority,
            "infrastructureType", location, depth, "projectId", "organizationId",
            impact, mitigation, "safetyMeasures", "reportedBy", contractor,
            "detectedDate", "reportedDate"
          ) VALUES (
            ${incident.incidentId},
            ${incident.title},
            ${incident.description},
            ${incident.category},
            ${incident.severity},
            ${incident.status},
            ${incident.priority},
            ${incident.infrastructureType},
            ${incident.location},
            ${incident.depth},
            ${incident.projectId},
            ${incident.organizationId},
            ${incident.impact},
            ${incident.mitigation},
            ${incident.safetyMeasures},
            'user_seed_admin',
            ${incident.contractor},
            ${incident.detectedDate},
            ${incident.reportedDate}
          )
        `);
        
        process.stdout.write(`\r   Progress: ${incidentCount} incidents created`);
      }
    }
    
    console.log("\n   ✅ Incidents created\n");

    // Verificatie
    const summary = await db.execute(sql`
      SELECT 
        category,
        "infrastructureType",
        COUNT(*) as count
      FROM projects
      GROUP BY category, "infrastructureType"
      ORDER BY category, "infrastructureType"
    `);

    console.log("📊 Project Summary:");
    summary.rows.forEach((row: any) => {
      console.log(`   ${row.category} - ${row.infrastructuretype}: ${row.count} projecten`);
    });

    console.log("\n✅ Database updated successfully!");
    console.log(`\n📈 Totalen:`);
    console.log(`   • ${infrastructureProjects.length} projecten`);
    console.log(`   • ${incidentCount} veiligheidsmeldingen`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

function generateInfraIncident(project: any, incidentNumber: number) {
  const infra = project.infrastructuretype || project.infrastructureType;
  
  const incidentTypes: Record<string, any[]> = {
    elektra: [
      { title: "Kabelbreuk tijdens graafwerkzaamheden", category: "graafschade" },
      { title: "Kortsluiting in kabelverbinding", category: "elektrisch" },
      { title: "Beschadiging kabelmantel", category: "graafschade" },
      { title: "Overbelasting transformator", category: "elektrisch" },
      { title: "Defecte kabellas geconstateerd", category: "corrosie" },
    ],
    gas: [
      { title: "Gaslekkage door graafschade", category: "lekkage" },
      { title: "Corrosie aan gietijzeren leiding", category: "corrosie" },
      { title: "Beschadiging PE gasleiding", category: "graafschade" },
      { title: "Geluidsoverlast drukregelstation", category: "structureel" },
      { title: "Gaslucht waarneming", category: "lekkage" },
    ],
    water: [
      { title: "Waterleiding lek na aanboring", category: "lekkage" },
      { title: "Rioolverstopping door bouwafval", category: "obstructie" },
      { title: "Verzakking door spoeling", category: "verzakking" },
      { title: "Asbestvezel aangetroffen", category: "verontreiniging" },
      { title: "Breuk in persleid ing", category: "structureel" },
    ],
    media: [
      { title: "Glasvezelkabel doorgekapt", category: "graafschade" },
      { title: "Beschadiging coaxkabel", category: "graafschade" },
      { title: "Water in kabelgoot", category: "lekkage" },
      { title: "Verstopte buisleiding", category: "obstructie" },
      { title: "Defecte koppelkast", category: "elektrisch" },
    ],
  };

  const types = incidentTypes[infra] || incidentTypes.elektra;
  const incident = types[Math.floor(Math.random() * types.length)];
  
  const severities = ["low", "medium", "high", "critical"];
  const statuses = ["open", "investigating", "resolved", "closed"];
  const priorities = ["low", "medium", "high", "urgent"];
  
  const locations = [
    "Hoofdstraat 45, Amsterdam",
    "Stationsplein 12, Utrecht",
    "Marktweg 89, Rotterdam",
    "Kerkstraat 23, Den Haag",
    "Industrieweg 156, Eindhoven",
  ];

  const contractors = [
    "BAM Infra",
    "VolkerWessels",
    "Van Gelder Groep",
    "Heijmans",
    "Strukton",
  ];

  const detectedDate = new Date(2024, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1);
  const reportedDate = new Date(detectedDate);
  reportedDate.setDate(reportedDate.getDate() + Math.floor(Math.random() * 2));

  return {
    incidentId: `VM-2024-${String(incidentNumber).padStart(4, '0')}`,
    title: incident.title,
    description: `${incident.title} geconstateerd tijdens ${project.category} werkzaamheden. Situatie vereist directe actie volgens CROW richtlijnen.`,
    category: incident.category,
    severity: severities[Math.floor(Math.random() * severities.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    infrastructureType: infra,
    location: locations[Math.floor(Math.random() * locations.length)],
    depth: `${(1 + Math.random() * 3).toFixed(1)}m NAP`,
    projectId: project.id,
    organizationId: null, // Wordt later gevuld via project
    impact: "Hinder voor verkeer. Tijdelijke omleidingen ingesteld. Omwonenden geïnformeerd.",
    mitigation: "Gebied afgezet conform VCA richtlijnen. Spoedreparatie ingepland binnen 24 uur.",
    safetyMeasures: "Werkgebied afgezet, verkeersregelaars ingezet, KLIC melding gedaan, omwonenden geïnformeerd.",
    contractor: contractors[Math.floor(Math.random() * contractors.length)],
    detectedDate: detectedDate.toISOString(),
    reportedDate: reportedDate.toISOString(),
  };
}

updateInfraData()
  .then(() => {
    console.log("\n✅ Update completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Update failed:", error);
    process.exit(1);
  });

