import "dotenv/config";
import { db } from "./index";
import { projectsTable, safetyIncidentsTable } from "./schema";

// Helper functies voor realistische data
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Data voor projecten
const projectNames = [
  "Riolering Centrum Renovatie",
  "Waterleiding Vervanging Noord",
  "Gasleiding Onderhoud Zuid",
  "Metro Tunnel Uitbreiding",
  "Elektra Netwerk Upgrade Oost",
  "Rioolstelsel Sanering West",
  "Drinkwater Infrastructuur",
  "Warmtenet Aanleg Centrum",
  "Telecom Kabel Vervanging",
  "Rioolgemaal Vernieuwing",
  "Ondergrondse Parkeergarage Bouw",
  "Tunnel Onderhoud A10",
  "Waterleidingen Vervanging",
  "Gasnet Modernisering",
  "Elektra Kabel Verlegging",
  "Rioolpers Renovatie",
  "Metrostation Verbouwing",
  "Waterbuffer Aanleg",
  "Warmteleiding Uitbreiding",
  "Glasvezel Netwerk Aanleg",
  "Rioolstelsel Capaciteit",
  "Waterleiding Bypass",
  "Gasdrukstation Upgrade",
  "Tunnel Veiligheid Project",
  "Ondergrondse Berging",
  "Rioolwaterzuivering Upgrade",
  "Drinkwater Kwaliteit Project",
  "Elektra Transformator Plaatsing",
  "Warmtewisselaar Installatie",
  "Telecom Hub Ondergronds"
];

const organizations = [
  "Waternet Amsterdam",
  "Liander",
  "Stedin",
  "GVB",
  "Gemeente Amsterdam",
  "Gemeente Rotterdam",
  "Gemeente Utrecht",
  "Rijkswaterstaat",
  "ProRail",
  "Dunea",
  "Vitens",
  "Eneco"
];

const projectManagers = [
  "Jan van der Berg",
  "Maria Jansen",
  "Pieter de Vries",
  "Emma Bakker",
  "Thomas Visser",
  "Sophie Smit",
  "Lucas de Jong",
  "Lisa Dijkstra",
  "Marco Vermeulen",
  "Anna Hendriks"
];

const amsterdamLocations = [
  "Kalverstraat 1, Amsterdam",
  "Damrak 50, Amsterdam",
  "Leidsestraat 25, Amsterdam",
  "Nieuwezijds Voorburgwal 147, Amsterdam",
  "Rokin 75, Amsterdam",
  "Vijzelstraat 20, Amsterdam",
  "Ferdinand Bolstraat 120, Amsterdam",
  "Overtoom 145, Amsterdam",
  "De Pijp, Amsterdam",
  "Jordaan, Amsterdam",
  "Oud-Zuid, Amsterdam",
  "Amsterdam Noord",
  "Amstelveen Centrum",
  "Diemen Zuid",
  "Hoofddorpplein, Amsterdam"
];

const contractors = [
  "BAM Infra",
  "VolkerWessels",
  "Heijmans",
  "Dura Vermeer",
  "Van Gelder Groep",
  "Strukton",
  "Mobilis",
  "DITT",
  "KWS Infra",
  "Jansen de Jong"
];

// Data voor veiligheidsmeldingen
const incidentTitles = {
  graafschade: [
    "Beschadiging waterleiding door graafwerkzaamheden",
    "Gasleiding geraakt tijdens heiwerkzaamheden",
    "Elektrakabel doorgestoken",
    "Telecomkabel beschadigd bij graven",
    "Rioolleiding geperforeerd"
  ],
  lekkage: [
    "Waterlekkage na koppeling",
    "Gaslucht geconstateerd",
    "Rioollekkage in straat",
    "Warmteleiding lekt",
    "Drinkwaterleiding barst"
  ],
  verzakking: [
    "Wegverzakking door spoeling",
    "Deformatie rioolbuis",
    "Verzakking bouwput",
    "Grondverzakking na graafwerk",
    "Holle ruimte onder wegdek"
  ],
  corrosie: [
    "Ernstige corrosie stalen leiding",
    "Roestvorming op laspunten",
    "Corrosie aan rioolbuis",
    "Leiding materiaalverzwakking",
    "Putdeksel corrosie"
  ],
  obstructie: [
    "Riool verstopt door bouwafval",
    "Leiding geblokkeerd",
    "Wortelingroei in riool",
    "Bezinksel in waterleiding",
    "Obstructie in gemaal"
  ],
  elektrisch: [
    "Stroomuitval door kabelbreuk",
    "Kortsluiting in kabelverbinding",
    "Defect transformatorstation",
    "Elektrische storing in tunnel",
    "Aardlekschakelaar defect"
  ],
  structureel: [
    "Scheur in tunnelwand",
    "Betonrot in rioolbuis",
    "Verzwakking constructie",
    "Damwand instabiliteit",
    "Brugdek beschadiging"
  ],
  verontreiniging: [
    "Bodemverontreiniging aangetroffen",
    "Asbest in grond",
    "Olielek in bodem",
    "Vervuilde grond ontdekt",
    "Chemische verontreiniging"
  ]
};

const categories = Object.keys(incidentTitles) as Array<keyof typeof incidentTitles>;
const severities = ["low", "medium", "high", "critical"] as const;
const statuses = ["open", "investigating", "resolved", "closed"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;
const infrastructureTypes = ["riool", "water", "gas", "elektra", "telecom", "warmte", "metro", "tunnel"] as const;

async function seed() {
  console.log("🌱 Starting database seeding...");
  
  // Dummy user ID (gebruik je eigen Clerk User ID of een test ID)
  const dummyUserId = "user_test_123456";
  
  try {
    // Stap 1: Maak 30 projecten aan
    console.log("\n📊 Creating 30 projects...");
    const projects = [];
    
    for (let i = 0; i < 30; i++) {
      const startDate = getRandomDate(new Date(2023, 0, 1), new Date(2024, 6, 1));
      const endDate = addDays(startDate, 180 + Math.floor(Math.random() * 365));
      const budget = (50000 + Math.floor(Math.random() * 450000)) * 100; // In centen
      
      const project = await db.insert(projectsTable).values({
        projectId: `PROJ-2024-${String(i + 1).padStart(3, '0')}`,
        name: projectNames[i],
        description: `Infrastructuurproject voor ${projectNames[i].toLowerCase()}. Dit project omvat werkzaamheden aan de ondergrondse infrastructuur met focus op veiligheid en kwaliteit.`,
        status: getRandomItem(['active', 'active', 'active', 'on-hold', 'completed']), // Meer actieve projecten
        projectManager: getRandomItem(projectManagers),
        organization: getRandomItem(organizations),
        startDate: startDate,
        plannedEndDate: endDate,
        budget: budget,
        currency: 'EUR',
        ownerId: dummyUserId,
      }).returning();
      
      projects.push(project[0]);
      process.stdout.write(`\rProjects created: ${i + 1}/30`);
    }
    
    console.log("\n✅ All projects created successfully!");
    
    // Stap 2: Maak veiligheidsmeldingen voor 15 willekeurige projecten
    console.log("\n⚠️  Creating safety incidents for 15 projects...");
    
    // Selecteer 15 willekeurige projecten
    const shuffledProjects = [...projects].sort(() => Math.random() - 0.5);
    const projectsWithIncidents = shuffledProjects.slice(0, 15);
    
    let totalIncidents = 0;
    
    for (const project of projectsWithIncidents) {
      // Genereer 2-6 meldingen per project voor goede data variatie
      const numIncidents = 2 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < numIncidents; i++) {
        const category = getRandomItem(categories);
        const severity = getRandomItem(severities);
        const status = getRandomItem(statuses);
        const priority = getRandomItem(priorities);
        const infrastructureType = getRandomItem(infrastructureTypes);
        
        // Zorg voor realistische datum verdeling over het afgelopen jaar
        const detectedDate = getRandomDate(new Date(2023, 6, 1), new Date());
        const reportedDate = addDays(detectedDate, Math.floor(Math.random() * 3));
        const resolvedDate = status === 'resolved' || status === 'closed' 
          ? addDays(reportedDate, 5 + Math.floor(Math.random() * 30))
          : null;
        
        // Genereer GPS coördinaten rond Amsterdam (52.3676° N, 4.9041° E)
        const lat = 52.3676 + (Math.random() - 0.5) * 0.1;
        const lng = 4.9041 + (Math.random() - 0.5) * 0.1;
        
        const depth = (1 + Math.random() * 4).toFixed(1); // 1-5 meter diep
        
        const title = getRandomItem(incidentTitles[category]);
        
        // Genereer realistische beschrijvingen
        const descriptions = [
          `Tijdens ${category === 'graafschade' ? 'graafwerkzaamheden' : 'inspectie'} is een ${category} geconstateerd. ${
            severity === 'critical' ? 'Acute actie vereist.' : 'Situatie wordt gemonitord.'
          }`,
          `${title}. Incident gemeld door aannemer. ${
            infrastructureType === 'gas' ? 'Gebied is afgezet.' : 'Verkeer wordt omgeleid.'
          }`,
          `Veiligheidsmelding: ${title.toLowerCase()}. Impact: ${
            severity === 'high' || severity === 'critical' ? 'hoog, directe actie nodig' : 'beperkt tot werkgebied'
          }.`
        ];
        
        const impacts = [
          `Hinder voor verkeer en omwonenden. ${severity === 'critical' ? 'Diensten tijdelijk uitgeschakeld.' : 'Beperkte overlast.'}`,
          `${infrastructureType === 'gas' ? 'Gastoevoer afgesloten in gebied.' : 'Minimale impact op dienstverlening.'}`,
          `Werkzaamheden stilgelegd. ${priority === 'urgent' ? 'Spoedreparatie noodzakelijk.' : 'Herstel gepland.'}`
        ];
        
        const mitigations = [
          "Gebied is afgezet met hekken en waarschuwingsborden. Verkeer omgeleid via alternatieve route.",
          "Spoedreparatie uitgevoerd door gecertificeerde aannemer. Situatie wordt 24/7 gemonitord.",
          "Tijdelijke voorziening aangebracht. Definitieve reparatie binnen 48 uur gepland.",
          "Omwonenden zijn geïnformeerd. Emergency response team stand-by."
        ];
        
        const safetyMeasuresOptions = [
          "Gebied afgezet met hekken en bebording. Verkeersregelaars ingezet.",
          "Gasdetectie apparatuur geplaatst. Permanente bewaking ter plaatse.",
          "Veiligheidsprotocol uitgevoerd. Alle betrokken partijen geïnformeerd.",
          "Tijdelijke overkapping geplaatst. Extra verlichting aangebracht voor nachtwerk."
        ];
        
        const riskAssessments = [
          `Risico ingeschat als ${severity}. ${severity === 'critical' ? 'Maximale urgentie.' : 'Reguliere monitoring.'}`,
          "Potentieel gevaar voor ondergrondse infrastructuur. Continue monitoring vereist.",
          `${severity === 'high' || severity === 'critical' ? 'Hoog risico op uitbreiding schade.' : 'Beperkt risico bij correct herstel.'}`
        ];
        
        totalIncidents++;
        
        await db.insert(safetyIncidentsTable).values({
          incidentId: `VM-2024-${String(totalIncidents).padStart(4, '0')}`,
          title: title,
          description: getRandomItem(descriptions),
          category: category,
          severity: severity,
          status: status,
          priority: priority,
          infrastructureType: infrastructureType,
          location: getRandomItem(amsterdamLocations),
          coordinates: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          depth: depth,
          projectId: project.id,
          impact: getRandomItem(impacts),
          mitigation: getRandomItem(mitigations),
          affectedSystems: `${infrastructureType} systeem in sector ${Math.floor(Math.random() * 10) + 1}`,
          safetyMeasures: getRandomItem(safetyMeasuresOptions),
          riskAssessment: getRandomItem(riskAssessments),
          reportedBy: dummyUserId,
          contractor: getRandomItem(contractors),
          detectedDate: detectedDate,
          reportedDate: reportedDate,
          resolvedDate: resolvedDate,
          tags: [
            category,
            severity,
            infrastructureType,
            Math.random() > 0.5 ? 'KLIC' : null,
            Math.random() > 0.7 ? 'spoed' : null
          ].filter(Boolean).join(','),
          externalReference: Math.random() > 0.5 ? `KLIC-2024-${Math.floor(Math.random() * 10000)}` : null,
        });
        
        process.stdout.write(`\rIncidents created: ${totalIncidents}`);
      }
    }
    
    console.log("\n✅ All safety incidents created successfully!");
    
    // Samenvatting
    console.log("\n📈 Seeding Summary:");
    console.log(`   • Projects: 30`);
    console.log(`   • Projects with incidents: 15`);
    console.log(`   • Total safety incidents: ${totalIncidents}`);
    console.log(`   • Average incidents per project: ${(totalIncidents / 15).toFixed(1)}`);
    
    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n💡 Tip: Je kunt nu trends analyseren op:");
    console.log("   - Incident categorie distributie");
    console.log("   - Ernst levels over tijd");
    console.log("   - Status veranderingen");
    console.log("   - Infrastructuur type risico's");
    console.log("   - Maandelijkse incident trends");
    
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  }
}

// Run seed functie
seed()
  .then(() => {
    console.log("\n✅ Seeding process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding process failed:", error);
    process.exit(1);
  });

