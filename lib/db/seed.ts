import "dotenv/config";
import { db } from "./index";
import { projectsTable, safetyIncidentsTable, organizationsTable, inspectionsTable, supervisionsTable } from "./schema";

// Helper functies voor realistische data
function getRandomItem<T>(array: readonly T[]): T {
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

// Plaats en gemeente combinaties voor Friesland, Flevoland, Gelderland en Noordoostpolder
const locationsWithMunicipality = [
  // Friesland
  { plaats: "Leeuwarden", gemeente: "Leeuwarden", locatie: "Nieuwestad 50, Leeuwarden" },
  { plaats: "Leeuwarden", gemeente: "Leeuwarden", locatie: "Wirdumerdijk 23, Leeuwarden" },
  { plaats: "Sneek", gemeente: "Súdwest-Fryslân", locatie: "Grootzand 12, Sneek" },
  { plaats: "Sneek", gemeente: "Súdwest-Fryslân", locatie: "Oppenhuizerweg 4, Sneek" },
  { plaats: "Heerenveen", gemeente: "Heerenveen", locatie: "Abe Lenstra Boulevard 1, Heerenveen" },
  { plaats: "Heerenveen", gemeente: "Heerenveen", locatie: "Skoatterwald 15, Heerenveen" },
  { plaats: "Drachten", gemeente: "Smallingerland", locatie: "De Helling 21, Drachten" },
  { plaats: "Drachten", gemeente: "Smallingerland", locatie: "Noorderhogeweg 56, Drachten" },
  { plaats: "Harlingen", gemeente: "Harlingen", locatie: "Voorstraat 88, Harlingen" },
  { plaats: "Franeker", gemeente: "Waadhoeke", locatie: "Voorstraat 2, Franeker" },
  
  // Flevoland
  { plaats: "Lelystad", gemeente: "Lelystad", locatie: "Agorabaan 12, Lelystad" },
  { plaats: "Lelystad", gemeente: "Lelystad", locatie: "Larserpoortweg 2, Lelystad" },
  { plaats: "Almere", gemeente: "Almere", locatie: "Stationsplein 1, Almere" },
  { plaats: "Almere", gemeente: "Almere", locatie: "Veluwezoom 50, Almere Buiten" },
  { plaats: "Almere", gemeente: "Almere", locatie: "Grote Markt 3, Almere Haven" },
  { plaats: "Dronten", gemeente: "Dronten", locatie: "De Rede 101, Dronten" },
  { plaats: "Dronten", gemeente: "Dronten", locatie: "Meerpaalweg 2, Dronten" },
  { plaats: "Zeewolde", gemeente: "Zeewolde", locatie: "Horsterweg 6, Zeewolde" },
  
  // Noordoostpolder (gemeente in Flevoland)
  { plaats: "Emmeloord", gemeente: "Noordoostpolder", locatie: "De Deel 12, Emmeloord" },
  { plaats: "Emmeloord", gemeente: "Noordoostpolder", locatie: "Espelerweg 1, Emmeloord" },
  { plaats: "Urk", gemeente: "Urk", locatie: "Wijk 1-50, Urk" },
  { plaats: "Urk", gemeente: "Urk", locatie: "Nagel 15, Urk" },
  { plaats: "Ens", gemeente: "Noordoostpolder", locatie: "Kuinderweg 2, Ens" },
  { plaats: "Kraggenburg", gemeente: "Noordoostpolder", locatie: "Marknesse 5, Kraggenburg" },
  
  // Gelderland
  { plaats: "Arnhem", gemeente: "Arnhem", locatie: "Westerstraat 10, Arnhem" },
  { plaats: "Arnhem", gemeente: "Arnhem", locatie: "Velperplein 88, Arnhem" },
  { plaats: "Nijmegen", gemeente: "Nijmegen", locatie: "Burchtstraat 1, Nijmegen" },
  { plaats: "Nijmegen", gemeente: "Nijmegen", locatie: "Keizer Karelplein 2, Nijmegen" },
  { plaats: "Apeldoorn", gemeente: "Apeldoorn", locatie: "Marktplein 1, Apeldoorn" },
  { plaats: "Apeldoorn", gemeente: "Apeldoorn", locatie: "Deventerstraat 55, Apeldoorn" },
  { plaats: "Ede", gemeente: "Ede", locatie: "Grotestraat 110, Ede" },
  { plaats: "Doetinchem", gemeente: "Doetinchem", locatie: "Simonsplein 2, Doetinchem" },
  { plaats: "Harderwijk", gemeente: "Harderwijk", locatie: "Markt 1, Harderwijk" },
  { plaats: "Zutphen", gemeente: "Zutphen", locatie: "Groenmarkt 55, Zutphen" },
  { plaats: "Tiel", gemeente: "Tiel", locatie: "Plein 48, Tiel" },
  { plaats: "Wageningen", gemeente: "Wageningen", locatie: "Stationsstraat 2, Wageningen" }
];

const amsterdamLocations = locationsWithMunicipality.map(l => l.locatie);

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
const disciplines = ["Elektra", "Gas", "Water", "Media"] as const;

// GPS coördinaten per plaats (gedeeld voor incidents en inspections)
const regionCoords: Record<string, { lat: number; lng: number }> = {
  'Leeuwarden': { lat: 53.2012, lng: 5.7999 },
  'Sneek': { lat: 53.0324, lng: 5.6579 },
  'Heerenveen': { lat: 52.9598, lng: 5.9196 },
  'Drachten': { lat: 53.1127, lng: 6.0989 },
  'Harlingen': { lat: 53.1745, lng: 5.4236 },
  'Franeker': { lat: 53.1865, lng: 5.5419 },
  'Lelystad': { lat: 52.5083, lng: 5.4750 },
  'Almere': { lat: 52.3508, lng: 5.2647 },
  'Dronten': { lat: 52.5252, lng: 5.7176 },
  'Zeewolde': { lat: 52.3299, lng: 5.5403 },
  'Emmeloord': { lat: 52.7108, lng: 5.7501 },
  'Urk': { lat: 52.6632, lng: 5.6013 },
  'Ens': { lat: 52.6381, lng: 5.8267 },
  'Kraggenburg': { lat: 52.6789, lng: 5.8967 },
  'Arnhem': { lat: 51.9851, lng: 5.8987 },
  'Nijmegen': { lat: 51.8426, lng: 5.8573 },
  'Apeldoorn': { lat: 52.2110, lng: 5.9699 },
  'Ede': { lat: 52.0408, lng: 5.6575 },
  'Doetinchem': { lat: 51.9658, lng: 6.2886 },
  'Harderwijk': { lat: 52.3500, lng: 5.6167 },
  'Zutphen': { lat: 52.1393, lng: 6.1950 },
  'Tiel': { lat: 51.8869, lng: 5.4294 },
  'Wageningen': { lat: 51.9693, lng: 5.6659 }
};

async function seed() {
  console.log("🌱 Starting database seeding...");
  
  // Dummy user ID (gebruik je eigen Clerk User ID of een test ID)
  const dummyUserId = "user_test_123456";
  
  // Genereer unieke suffix voor dit seed run (om duplicaat errors te voorkomen)
  const timestamp = Date.now().toString().slice(-6);
  
  try {
    // Stap 0: Haal organisaties op (of maak ze aan als ze niet bestaan)
    console.log("\n🏢 Fetching organizations...");
    let organizations = await db.select().from(organizationsTable);
    
    if (organizations.length === 0) {
      console.log("   ⚠️  Geen organisaties gevonden. Voer eerst 'npm run db:seed-orgs' uit, of koppel projecten later met 'npm run db:fix-orgs'");
      console.log("   📝 Projecten worden aangemaakt zonder organizationId\n");
    } else {
      console.log(`   ✅ ${organizations.length} organisaties gevonden\n`);
    }
    
    // Stap 1: Maak 30 projecten aan
    console.log("📊 Creating 30 projects...");
    const projects = [];
    
    for (let i = 0; i < 30; i++) {
      const startDate = getRandomDate(new Date(2023, 0, 1), new Date(2024, 6, 1));
      const endDate = addDays(startDate, 180 + Math.floor(Math.random() * 365));
      const budget = (50000 + Math.floor(Math.random() * 450000)) * 100; // In centen
      
      // Kies een locatie met plaats en gemeente
      const locationData = getRandomItem(locationsWithMunicipality);
      
      // Kies een willekeurige organisatie als er organisaties zijn
      const organizationId = organizations.length > 0
        ? organizations[Math.floor(Math.random() * organizations.length)].id
        : null;
      
      const project = await db.insert(projectsTable).values({
        projectId: `PROJ-${timestamp}-${String(i + 1).padStart(3, '0')}`,
        name: projectNames[i],
        description: `Infrastructuurproject voor ${projectNames[i].toLowerCase()} in ${locationData.plaats}. Dit project omvat werkzaamheden aan de ondergrondse infrastructuur met focus op veiligheid en kwaliteit.`,
        status: getRandomItem(['active', 'active', 'active', 'on-hold', 'completed']), // Meer actieve projecten
        plaats: locationData.plaats,
        gemeente: locationData.gemeente,
        projectManager: getRandomItem(projectManagers),
        startDate: startDate,
        plannedEndDate: endDate,
        budget: budget,
        currency: 'EUR',
        ownerId: dummyUserId,
        organizationId: organizationId,
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
        const discipline = getRandomItem(disciplines);
        
        // Zorg voor realistische datum verdeling over het afgelopen jaar
        const detectedDate = getRandomDate(new Date(2023, 6, 1), new Date());
        const reportedDate = addDays(detectedDate, Math.floor(Math.random() * 3));
        const resolvedDate = status === 'resolved' || status === 'closed' 
          ? addDays(reportedDate, 5 + Math.floor(Math.random() * 30))
          : null;
        
        // Selecteer locatie die matcht met project regio (voor realistische GPS coördinaten)
        const incidentLocation = getRandomItem(locationsWithMunicipality);
        
        // Genereer GPS coördinaten gebaseerd op de regio
        const baseCoords = regionCoords[incidentLocation.plaats] || { lat: 52.3676, lng: 4.9041 };
        const lat = baseCoords.lat + (Math.random() - 0.5) * 0.02; // Kleine variatie
        const lng = baseCoords.lng + (Math.random() - 0.5) * 0.02;
        
        const depth = (1 + Math.random() * 4).toFixed(1); // 1-5 meter diep
        
        const title = getRandomItem(incidentTitles[category]);
        
        // Genereer realistische beschrijvingen
        const descriptions = [
          `Tijdens ${category === 'graafschade' ? 'graafwerkzaamheden' : 'inspectie'} is een ${category} geconstateerd. ${
            severity === 'critical' ? 'Acute actie vereist.' : 'Situatie wordt gemonitord.'
          }`,
          `${title}. Incident gemeld door aannemer. ${
            discipline === 'Gas' ? 'Gebied is afgezet.' : 'Verkeer wordt omgeleid.'
          }`,
          `Veiligheidsmelding: ${title.toLowerCase()}. Impact: ${
            severity === 'high' || severity === 'critical' ? 'hoog, directe actie nodig' : 'beperkt tot werkgebied'
          }.`
        ];
        
        const impacts = [
          `Hinder voor verkeer en omwonenden. ${severity === 'critical' ? 'Diensten tijdelijk uitgeschakeld.' : 'Beperkte overlast.'}`,
          `${discipline === 'Gas' ? 'Gastoevoer afgesloten in gebied.' : 'Minimale impact op dienstverlening.'}`,
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
          incidentId: `VM-${timestamp}-${String(totalIncidents).padStart(4, '0')}`,
          title: title,
          description: getRandomItem(descriptions),
          category: category,
          severity: severity,
          status: status,
          priority: priority,
          discipline: discipline,
          location: incidentLocation.locatie,
          coordinates: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          depth: depth,
          projectId: project.id,
          organizationId: project.organizationId || null, // Gebruik organizationId van project
          impact: getRandomItem(impacts),
          mitigation: getRandomItem(mitigations),
          affectedSystems: `${discipline} systeem in sector ${Math.floor(Math.random() * 10) + 1}`,
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
            discipline,
            Math.random() > 0.5 ? 'KLIC' : null,
            Math.random() > 0.7 ? 'spoed' : null
          ].filter(Boolean).join(','),
          externalReference: Math.random() > 0.5 ? `KLIC-2024-${Math.floor(Math.random() * 10000)}` : null,
        });
        
        process.stdout.write(`\rIncidents created: ${totalIncidents}`);
      }
    }
    
    console.log("\n✅ All safety incidents created successfully!");
    
    // Stap 3: Maak schouwen voor 25% van de projecten
    console.log("\n🔍 Creating inspections for 25% of projects...");
    
    // Haal alle projecten op (inclusief de net aangemaakte)
    const allProjects = await db.select().from(projectsTable);
    
    // Selecteer 25% van de projecten (afgerond naar boven)
    const inspectionCount = Math.ceil(allProjects.length * 0.25);
    const shuffledAllProjects = [...allProjects].sort(() => Math.random() - 0.5);
    const projectsWithInspections = shuffledAllProjects.slice(0, inspectionCount);
    
    // Testdata voor schouwen
    const inspectionTitles = [
      "Schouw aansluitleidingen nieuwe woning",
      "Inspectie elektra aansluiting",
      "Controle gasleiding gereedheid",
      "Schouw wateraansluiting project",
      "Eindcontrole aansluitleidingen",
      "Inspectie aansluitingen bouwblok",
      "Schouw voor aansluiting elektra/gas/water",
      "Gereedheidscontrole aansluitleidingen",
      "Inspectie aansluitingen woningbouw",
      "Schouw utiliteitsaansluitingen",
      "Eindschouw aansluitleidingen",
      "Controle aansluitingen voor oplevering",
      "Inspectie aansluitleidingen project fase 2",
      "Schouw aansluitingen appartementencomplex",
      "Gereedheidsinspectie aansluitleidingen"
    ];
    
    const connectionTypesOptions = [
      ["elektra"],
      ["gas"],
      ["water"],
      ["elektra", "gas"],
      ["elektra", "water"],
      ["gas", "water"],
      ["elektra", "gas", "water"]
    ];
    
    const inspectionStatuses = ["open", "in_behandeling", "afgerond", "afgekeurd"] as const;
    const readinessStatuses = ["goedgekeurd", "afgekeurd", "in_beoordeling"] as const;
    
    const checklistItems = [
      { id: "1", item: "Elektra aansluiting correct geïnstalleerd", checked: true },
      { id: "2", item: "Gasleiding drukproef uitgevoerd", checked: true },
      { id: "3", item: "Wateraansluiting lekdicht", checked: true },
      { id: "4", item: "Aansluitpunten vrij toegankelijk", checked: false },
      { id: "5", item: "Meterkast correct geplaatst", checked: true },
      { id: "6", item: "Veiligheidsvoorzieningen aanwezig", checked: true },
      { id: "7", item: "Documentatie compleet", checked: false },
      { id: "8", item: "Aardlekbeveiliging getest", checked: true },
      { id: "9", item: "Gasafsluiter functioneel", checked: true },
      { id: "10", item: "Waterafsluiter bereikbaar", checked: true }
    ];
    
    const notesOptions = [
      "Schouw uitgevoerd conform NEN normen. Alle aansluitingen zijn correct geïnstalleerd.",
      "Tijdens inspectie zijn enkele kleine aanpassingen geconstateerd. Deze zijn tijdens de schouw direct opgelost.",
      "Alle aansluitingen zijn gecontroleerd en voldoen aan de gestelde eisen. Project is gereed voor aansluiting.",
      "Schouw uitgevoerd met goede resultaten. Alle meetwaarden zijn binnen de normen.",
      "Inspectie toont aan dat alle aansluitingen correct zijn uitgevoerd. Geen afwijkingen geconstateerd.",
      "Tijdens schouw zijn enkele aandachtspunten genoteerd. Deze zijn niet kritiek maar verdienen aandacht.",
      "Alle aansluitleidingen zijn geïnspecteerd en voldoen aan de veiligheidseisen. Geen belemmeringen voor aansluiting."
    ];
    
    const remarksOptions = [
      "Aansluitingen zijn correct uitgevoerd. Project kan worden aangesloten.",
      "Kleine aanpassingen nodig aan meteropstelling. Verder alles conform.",
      "Alle aansluitingen getest en goedgekeurd. Geen afwijkingen.",
      "Aansluitpunten zijn goed bereikbaar en correct geïnstalleerd.",
      "Schouw positief afgerond. Alle systemen functioneren naar behoren.",
      "Enkele verbeterpunten genoteerd voor toekomstige projecten. Geen belemmeringen.",
      "Alle aansluitleidingen voldoen aan de eisen. Project gereed voor aansluiting op netwerk."
    ];
    
    let totalInspections = 0;
    
    for (const project of projectsWithInspections) {
      const title = getRandomItem(inspectionTitles);
      const connectionTypes = getRandomItem(connectionTypesOptions);
      const status = getRandomItem(inspectionStatuses);
      
      // Realistische readiness status op basis van status
      let readinessStatus: typeof readinessStatuses[number] | null = null;
      if (status === "afgerond") {
        readinessStatus = Math.random() > 0.15 ? "goedgekeurd" : "afgekeurd";
      } else if (status === "in_behandeling") {
        readinessStatus = "in_beoordeling";
      }
      
      // Genereer inspection datum (tussen project start en nu)
      const projectStart = project.startDate ? new Date(project.startDate) : new Date(2023, 0, 1);
      const inspectionDate = getRandomDate(projectStart, new Date());
      
      // Kies een locatie die matcht met project
      const inspectionLocation = getRandomItem(locationsWithMunicipality);
      
      // Genereer GPS coördinaten (hergebruik dezelfde regionCoords logica)
      const baseCoords = regionCoords[project.plaats || ''] || regionCoords[inspectionLocation.plaats] || { lat: 52.3676, lng: 4.9041 };
      const lat = baseCoords.lat + (Math.random() - 0.5) * 0.02;
      const lng = baseCoords.lng + (Math.random() - 0.5) * 0.02;
      
      // Genereer checklist (sommige items checked, andere niet)
      const checklist = checklistItems.map(item => ({
        ...item,
        checked: Math.random() > 0.3 // 70% checked
      }));
      
      // Genereer beschrijving
      const description = `Schouw voor aansluitleidingen ${connectionTypes.join(', ')} bij project ${project.name}. Inspectie uitgevoerd door gecertificeerde schouwer.`;
      
      totalInspections++;
      
      await db.insert(inspectionsTable).values({
        inspectionId: `SCH-${timestamp}-${String(totalInspections).padStart(3, '0')}`,
        title: title,
        description: description,
        projectId: project.id,
        organizationId: project.organizationId || null,
        connectionTypes: JSON.stringify(connectionTypes),
        status: status,
        readinessStatus: readinessStatus,
        checklist: JSON.stringify(checklist),
        location: inspectionLocation.locatie,
        coordinates: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        inspectedBy: dummyUserId,
        inspectionDate: inspectionDate,
        notes: getRandomItem(notesOptions),
        remarks: getRandomItem(remarksOptions),
      });
      
      process.stdout.write(`\rInspections created: ${totalInspections}/${inspectionCount}`);
    }
    
    console.log("\n✅ All inspections created successfully!");
    
    // Stap 4: Maak toezichten voor 25% van de projecten
    console.log("\n🔍 Creating supervisions for 25% of projects...");
    
    // Selecteer 25% van de projecten (willekeurig, maar niet dezelfde als inspections)
    const supervisionCount = Math.ceil(allProjects.length * 0.25);
    const remainingProjects = allProjects.filter(p => !projectsWithInspections.some(ip => ip.id === p.id));
    const shuffledRemainingProjects = [...remainingProjects].sort(() => Math.random() - 0.5);
    const projectsWithSupervisions = shuffledRemainingProjects.slice(0, Math.min(supervisionCount, remainingProjects.length));
    
    // Testdata voor toezichten
    const supervisionTitles = [
      "Kwaliteitscontrole montage werkzaamheden",
      "Toezicht diepteligging leidingen",
      "Controle uitvoering volgens tekening",
      "Kwaliteitsinspectie aansluitleidingen",
      "Toezicht op materiaalgebruik",
      "Controle werkmap en documentatie",
      "Kwaliteitsbeoordeling project fase 1",
      "Toezicht op veiligheidsmaatregelen",
      "Inspectie conform NEN normen",
      "Kwaliteitscontrole afronding werkzaamheden",
      "Toezicht op bescherming leidingen",
      "Controle markering en bebording",
      "Kwaliteitsinspectie drukproeven",
      "Toezicht op lekdichtheid",
      "Eindcontrole kwaliteit project"
    ];
    
    const overallQualityOptions = ["excellent", "goed", "voldoende", "onvoldoende"];
    const supervisionStatuses = ["open", "in_behandeling", "afgerond", "afgekeurd"] as const;
    
    const findingsOptions = [
      "Tijdens toezicht zijn enkele kleine afwijkingen geconstateerd. Deze zijn direct opgelost.",
      "Alle werkzaamheden zijn uitgevoerd conform de gestelde normen. Geen afwijkingen geconstateerd.",
      "Enkele aandachtspunten genoteerd voor verbetering in toekomstige projecten.",
      "Alle kwaliteitsnormen zijn nageleefd. Project voldoet aan de eisen.",
      "Tijdens inspectie zijn enkele verbeterpunten geïdentificeerd. Niet kritiek.",
      "Alle controles zijn positief uitgevallen. Kwaliteit is in orde.",
      "Enkele kleine afwijkingen geconstateerd die tijdens de werkzaamheden zijn gecorrigeerd."
    ];
    
    const recommendationsOptions = [
      "Aanbeveling: verbeter de documentatie in werkmap voor toekomstige projecten.",
      "Aanbeveling: zorg voor betere markering van leidingen tijdens werkzaamheden.",
      "Aanbeveling: verbeter de communicatie tussen aannemer en toezichthouder.",
      "Aanbeveling: voer meer frequente kwaliteitscontroles uit tijdens kritieke fasen.",
      "Aanbeveling: verbeter de bescherming van leidingen tijdens werkzaamheden.",
      "Aanbeveling: zorg voor betere diepteligging controle tijdens plaatsing.",
      "Aanbeveling: verbeter de montage kwaliteit door extra training van personeel."
    ];
    
    let totalSupervisions = 0;
    
    for (const project of projectsWithSupervisions) {
      const title = getRandomItem(supervisionTitles);
      const discipline = getRandomItem(disciplines);
      const status = getRandomItem(supervisionStatuses);
      const overallQuality = getRandomItem(overallQualityOptions);
      
      // Genereer supervision datum (tussen project start en nu)
      const projectStart = project.startDate ? new Date(project.startDate) : new Date(2023, 0, 1);
      const supervisionDate = getRandomDate(projectStart, new Date());
      
      // Kies een locatie die matcht met project
      const supervisionLocation = getRandomItem(locationsWithMunicipality);
      
      // Genereer GPS coördinaten
      const baseCoords = regionCoords[project.plaats || ''] || regionCoords[supervisionLocation.plaats] || { lat: 52.3676, lng: 4.9041 };
      const lat = baseCoords.lat + (Math.random() - 0.5) * 0.02;
      const lng = baseCoords.lng + (Math.random() - 0.5) * 0.02;
      
      // Genereer kwaliteitsnormen (sommige normen beoordeeld, andere niet)
      const qualityStandards: Record<string, string> = {};
      
      // Altijd montage kwaliteit beoordelen
      qualityStandards.montage = getRandomItem(["excellent", "goed", "voldoende", "onvoldoende"]);
      
      // Altijd diepteligging beoordelen
      qualityStandards.diepteligging = getRandomItem(["conform", "niet_conform"]);
      
      // Meestal werkmap beoordelen
      if (Math.random() > 0.2) {
        qualityStandards.werkmap = getRandomItem(["aanwezig", "niet_aanwezig"]);
      }
      
      // Meestal volgens tekening beoordelen
      if (Math.random() > 0.2) {
        qualityStandards.volgensTekening = getRandomItem(["ja", "nee"]);
      }
      
      // Discipline-specifieke normen
      if (discipline === "Elektra") {
        if (Math.random() > 0.3) {
          qualityStandards.aarding = getRandomItem(["conform", "niet_conform"]);
        }
        if (Math.random() > 0.3) {
          qualityStandards.materiaalGebruik = getRandomItem(["excellent", "goed", "voldoende", "onvoldoende"]);
        }
      } else if (discipline === "Gas" || discipline === "Water") {
        if (Math.random() > 0.3) {
          qualityStandards.drukproef = getRandomItem(["geslaagd", "niet_geslaagd"]);
        }
        if (Math.random() > 0.3) {
          qualityStandards.lekdichtheid = getRandomItem(["lekdicht", "niet_lekdicht"]);
        }
      }
      
      // Optionele normen
      if (Math.random() > 0.5) {
        qualityStandards.bescherming = getRandomItem(["voldoende", "onvoldoende"]);
      }
      if (Math.random() > 0.5) {
        qualityStandards.markering = getRandomItem(["aanwezig", "niet_aanwezig"]);
      }
      
      // Genereer beschrijving
      const description = `Kwaliteitscontrole en toezicht op ${discipline} project ${project.name}. Toezicht uitgevoerd door gecertificeerde toezichthouder conform NEN normen.`;
      
      totalSupervisions++;
      
      await db.insert(supervisionsTable).values({
        supervisionId: `TOZ-${timestamp}-${String(totalSupervisions).padStart(3, '0')}`,
        title: title,
        description: description,
        projectId: project.id,
        organizationId: project.organizationId || null,
        discipline: discipline,
        status: status,
        overallQuality: overallQuality,
        qualityStandards: JSON.stringify(qualityStandards),
        location: supervisionLocation.locatie,
        coordinates: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        supervisedBy: dummyUserId,
        supervisionDate: supervisionDate,
        notes: getRandomItem([
          "Toezicht uitgevoerd conform NEN normen. Alle kwaliteitsnormen zijn gecontroleerd.",
          "Tijdens inspectie zijn enkele kleine aandachtspunten geconstateerd. Deze zijn niet kritiek.",
          "Alle werkzaamheden zijn gecontroleerd en voldoen aan de gestelde eisen.",
          "Toezicht uitgevoerd met goede resultaten. Alle meetwaarden zijn binnen de normen.",
          "Inspectie toont aan dat alle werkzaamheden correct zijn uitgevoerd.",
          "Tijdens toezicht zijn enkele verbeterpunten genoteerd voor toekomstige projecten.",
        ]),
        findings: getRandomItem(findingsOptions),
        recommendations: getRandomItem(recommendationsOptions),
      });
      
      process.stdout.write(`\rSupervisions created: ${totalSupervisions}/${supervisionCount}`);
    }
    
    console.log("\n✅ All supervisions created successfully!");
    
    // Samenvatting
    console.log("\n📈 Seeding Summary:");
    console.log(`   • Projects: ${allProjects.length}`);
    console.log(`   • Projects with incidents: 15`);
    console.log(`   • Total safety incidents: ${totalIncidents}`);
    console.log(`   • Projects with inspections: ${inspectionCount} (${((inspectionCount / allProjects.length) * 100).toFixed(0)}%)`);
    console.log(`   • Total inspections: ${totalInspections}`);
    console.log(`   • Projects with supervisions: ${projectsWithSupervisions.length} (${((projectsWithSupervisions.length / allProjects.length) * 100).toFixed(0)}%)`);
    console.log(`   • Total supervisions: ${totalSupervisions}`);
    console.log(`   • Average incidents per project: ${(totalIncidents / 15).toFixed(1)}`);
    
    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n💡 Tip: Je kunt nu trends analyseren op:");
    console.log("   - Incident categorie distributie");
    console.log("   - Ernst levels over tijd");
    console.log("   - Status veranderingen");
    console.log("   - Infrastructuur type risico's");
    console.log("   - Maandelijkse incident trends");
    console.log("   - Schouw gereedheid per project");
    console.log("   - Aansluitleiding type distributie");
    console.log("   - Kwaliteitsnormen per discipline");
    console.log("   - Toezicht kwaliteit trends");
    
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

