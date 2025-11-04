import { integer, pgTable, varchar, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";

// ============================================
// ORGANIZATIONS & USER MANAGEMENT
// ============================================

// Organizations - bedrijven/organisaties binnen het platform
export const organizationsTable = pgTable("organizations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull().unique(), // URL-friendly identifier
  description: text(),
  logo: text(), // URL naar logo
  website: varchar({ length: 255 }),
  contactEmail: varchar({ length: 255 }),
  contactPhone: varchar({ length: 50 }),
  address: text(),
  status: varchar({ length: 50 }).default('active'), // active, suspended, inactive
  createdBy: varchar({ length: 255 }).notNull(), // Clerk User ID van creator
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// User Roles - globale systeemrollen (platform-breed)
export const userRolesTable = pgTable("user_roles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: varchar({ length: 255 }).notNull().unique(),
  role: varchar({ length: 50 }).notNull().default('user'), // 'super_admin', 'admin', 'user'
  assignedBy: varchar({ length: 255 }), // Clerk User ID van assigner
  assignedAt: timestamp().defaultNow().notNull(),
  notes: text(), // Notities over waarom deze rol is toegewezen
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// Organization Members - gebruikers binnen organisaties met organisatie-specifieke rollen
export const organizationMembersTable = pgTable("organization_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer().notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  clerkUserId: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 50 }).notNull().default('member'), // 'owner', 'admin', 'manager', 'member', 'viewer'
  permissions: text(), // JSON array van specifieke permissies
  invitedBy: varchar({ length: 255 }), // Clerk User ID van uitnodiger
  joinedAt: timestamp().defaultNow().notNull(),
  status: varchar({ length: 50 }).default('active'), // active, suspended, invited
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// User Preferences - applicatie specifieke instellingen per gebruiker
// Gebruik Clerk User ID direct als foreign key
export const userPreferencesTable = pgTable("user_preferences", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: varchar({ length: 255 }).notNull().unique(), // Clerk User ID
  
  // Algemene voorkeuren
  theme: varchar({ length: 50 }).default('theme-slate'),
  language: varchar({ length: 10 }).default('nl'),
  timezone: varchar({ length: 50 }).default('Europe/Amsterdam'),
  dateFormat: varchar({ length: 20 }).default('DD-MM-YYYY'),
  timeFormat: varchar({ length: 10 }).default('24h'), // '24h' of '12h'
  
  // Dashboard voorkeuren
  dashboardLayout: varchar({ length: 20 }).default('standard'), // 'compact', 'standard', 'detailed'
  itemsPerPage: integer().default(25),
  defaultDashboardSection: varchar({ length: 50 }), // 'projects', 'incidents', 'analytics'
  
  // Kaart voorkeuren (JSON voor flexibiliteit)
  mapSettings: text(), // JSON: { defaultZoom: 8, center: [lat, lng], showProjects: true, showIncidents: true, mapStyle: 'osm' }
  
  // Notificatie voorkeuren (JSON voor granulariteit)
  emailNotifications: boolean().default(true),
  notificationPreferences: text(), // JSON: { emailIncidents: true, emailProjects: true, emailAI: true, dailySummary: false, weeklySummary: false, criticalAlerts: true }
  
  // Filter voorkeuren (JSON)
  defaultFilters: text(), // JSON: { projects: { status: 'active' }, incidents: { severity: ['high', 'critical'] } }
  
  // Sortering voorkeuren (JSON)
  defaultSorting: text(), // JSON: { projects: { column: 'createdAt', direction: 'desc' }, incidents: { column: 'severity', direction: 'asc' } }
  
  // AI voorkeuren
  aiAutoAnalysis: boolean().default(false),
  defaultAIModel: varchar({ length: 50 }).default('gpt-4'),
  showAISuggestions: boolean().default(true),
  autoGenerateToolbox: boolean().default(false),
  
  // Organisatie voorkeuren
  defaultOrganizationId: integer().references(() => organizationsTable.id, { onDelete: "set null" }), // Standaard organisatie
  
  // Weergave voorkeuren
  compactMode: boolean().default(false),
  autoRefresh: boolean().default(true),
  autoRefreshInterval: integer().default(30000), // In milliseconden (30 seconden default)
  
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// User Module Permissions - module rechten per gebruiker
export const userModulePermissionsTable = pgTable("user_module_permissions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: varchar({ length: 255 }).notNull(), // Clerk User ID
  module: varchar({ length: 50 }).notNull(), // 'ai-safety', 'ai-schouw', 'ai-toezicht'
  granted: boolean().default(true), // Of de gebruiker toegang heeft tot deze module
  grantedBy: varchar({ length: 255 }), // Clerk User ID van degene die de rechten heeft verstrekt
  grantedAt: timestamp().defaultNow().notNull(),
  notes: text(), // Notities over waarom deze rechten zijn verstrekt
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
}, (table) => ({
  // Unieke constraint: één record per gebruiker per module
  uniqueUserModule: unique().on(table.clerkUserId, table.module),
}));

// ============================================
// PROJECTS & SAFETY
// ============================================

// Projects - uitgebreid schema voor projectbeheer
export const projectsTable = pgTable("projects", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  projectId: varchar({ length: 50 }).notNull().unique(), // Uniek project ID (bijv. PROJ-2024-001)
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  status: varchar({ length: 50 }).default('active'), // active, on-hold, completed, cancelled
  
  // Organisatie koppeling
  organizationId: integer().references(() => organizationsTable.id, { onDelete: "cascade" }),
  
  // Project categorie en type
  category: varchar({ length: 50 }), // sanering, reconstructie, nieuwe-aanleg
  discipline: varchar({ length: 50 }), // Elektra, Gas, Water, Media
  
  // Locatie informatie
  plaats: varchar({ length: 100 }), // Plaats waar het project plaatsvindt
  gemeente: varchar({ length: 100 }), // Gemeente van het project
  coordinates: varchar({ length: 50 }), // GPS coördinaten "lat, lng"
  
  // Project details
  projectManager: varchar({ length: 255 }), // Naam van de projectmanager
  projectManagerId: varchar({ length: 255 }), // Clerk User ID van de projectmanager
  
  // Datum informatie
  startDate: timestamp(),
  endDate: timestamp(),
  plannedEndDate: timestamp(),
  
  // Budget informatie (optioneel)
  budget: integer(), // In centen voor precisie
  currency: varchar({ length: 10 }).default('EUR'),
  
  // Eigenaar en toegang
  ownerId: varchar({ length: 255 }).notNull(), // Clerk User ID van eigenaar
  
  // Metadata
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// Optioneel: Team members tabel voor meerdere mensen per project
export const projectMembersTable = pgTable("project_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer().notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  clerkUserId: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 50 }).notNull(), // project-manager, developer, designer, etc.
  joinedAt: timestamp().defaultNow().notNull(),
});

// Safety Incidents - veiligheidsmeldingen voor ondergrondse infrastructuur
export const safetyIncidentsTable = pgTable("safety_incidents", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  incidentId: varchar({ length: 50 }).notNull().unique(), // Uniek incident ID (bijv. VM-2024-001)
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  
  // Categorisatie - specifiek voor ondergrondse infrastructuur
  category: varchar({ length: 100 }).notNull(), // graafschade, lekkage, verzakking, corrosie, obstructie, elektrisch, structureel, verontreiniging, etc.
  severity: varchar({ length: 50 }).notNull(), // low, medium, high, critical
  status: varchar({ length: 50 }).default('open'), // open, investigating, resolved, closed
  priority: varchar({ length: 50 }).default('medium'), // low, medium, high, urgent
  
  // Organisatie koppeling
  organizationId: integer().references(() => organizationsTable.id, { onDelete: "set null" }),
  
  // Discipline specifiek
  discipline: varchar({ length: 100 }), // Elektra, Gas, Water, Media
  location: text(), // Locatie/adres van het incident
  coordinates: varchar({ length: 100 }), // GPS coördinaten
  depth: varchar({ length: 50 }), // Diepte in meters
  
  // Project koppeling (nullable - voor algemene meldingen)
  projectId: integer().references(() => projectsTable.id, { onDelete: "set null" }),
  
  // Impact en acties
  impact: text(), // Beschrijving van de impact (bijv. hinder, uitval diensten)
  mitigation: text(), // Genomen of voorgestelde maatregelen
  affectedSystems: text(), // Welke systemen/infrastructuur is getroffen
  
  // Veiligheid en risico
  safetyMeasures: text(), // Genomen veiligheidsmaatregelen ter plaatse
  riskAssessment: text(), // Risico inschatting
  
  // Personen en instanties
  reportedBy: varchar({ length: 255 }).notNull(), // Clerk User ID van melder
  assignedTo: varchar({ length: 255 }), // Clerk User ID van toegewezen persoon
  contractor: varchar({ length: 255 }), // Aannemer/uitvoerende partij
  
  // Datums
  detectedDate: timestamp(), // Wanneer is het incident gedetecteerd
  reportedDate: timestamp().defaultNow().notNull(), // Wanneer is het gerapporteerd
  resolvedDate: timestamp(), // Wanneer is het opgelost
  
  // Documentatie
  tags: text(), // Comma-separated tags
  externalReference: varchar({ length: 255 }), // Link naar externe documentatie/KLIC melding
  photos: text(), // JSON array met foto URLs
  toolboxPresentations: text(), // JSON array met toolbox PPT file paths
  
  // Metadata
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// AI Schouwen - inspecties voor aansluitleidingen
export const inspectionsTable = pgTable("inspections", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  inspectionId: varchar({ length: 50 }).notNull().unique(), // Uniek schouw ID (bijv. SCH-2024-001)
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  
  // Project koppeling (verplicht)
  projectId: integer().references(() => projectsTable.id, { onDelete: "cascade" }).notNull(),
  
  // Organisatie koppeling
  organizationId: integer().references(() => organizationsTable.id, { onDelete: "set null" }),
  
  // Type aansluiting
  connectionTypes: varchar({ length: 255 }), // JSON array: ["elektra", "gas", "water"]
  
  // Status
  status: varchar({ length: 50 }).default('open'), // open, in_behandeling, afgerond, afgekeurd
  
  // Gereedheid beoordeling
  readinessStatus: varchar({ length: 50 }), // goedgekeurd, afgekeurd, in_beoordeling
  
  // Checklist (JSON)
  checklist: text(), // JSON array met checklist items
  
  // Locatie
  location: text(),
  coordinates: varchar({ length: 100 }), // GPS coördinaten
  
  // Personen
  inspectedBy: varchar({ length: 255 }).notNull(), // Clerk User ID van schouwer
  assignedTo: varchar({ length: 255 }), // Clerk User ID van toegewezen persoon
  
  // Datums
  inspectionDate: timestamp(), // Wanneer is de schouw uitgevoerd
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
  
  // Documentatie
  photos: text(), // JSON array met foto URLs
  notes: text(), // Algemene notities bij de schouw
  remarks: text(), // Opmerkingen/bevindingen
});

// AI Toezicht - kwaliteitscontrole op projecten
export const supervisionsTable = pgTable("supervisions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  supervisionId: varchar({ length: 50 }).notNull().unique(), // Uniek toezicht ID (bijv. TOZ-2024-001)
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  
  // Project koppeling (verplicht)
  projectId: integer().references(() => projectsTable.id, { onDelete: "cascade" }).notNull(),
  
  // Organisatie koppeling
  organizationId: integer().references(() => organizationsTable.id, { onDelete: "set null" }),
  
  // Discipline/Type infrastructuur
  discipline: varchar({ length: 100 }), // Elektra, Gas, Water, Media
  
  // Status
  status: varchar({ length: 50 }).default('open'), // open, in_behandeling, afgerond, afgekeurd
  
  // Algemene beoordeling
  overallQuality: varchar({ length: 50 }), // excellent, goed, voldoende, onvoldoende
  
  // Kwaliteitsnormen (JSON)
  qualityStandards: text(), // JSON object met kwaliteitsscores per norm
  
  // Locatie
  location: text(),
  coordinates: varchar({ length: 100 }), // GPS coördinaten
  
  // Personen
  supervisedBy: varchar({ length: 255 }).notNull(), // Clerk User ID van toezichthouder
  assignedTo: varchar({ length: 255 }), // Clerk User ID van toegewezen persoon
  
  // Datums
  supervisionDate: timestamp(), // Wanneer is het toezicht uitgevoerd
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
  
  // Documentatie
  photos: text(), // JSON array met foto URLs
  notes: text(), // Algemene notities bij het toezicht
  findings: text(), // Bevindingen en afwijkingen
  recommendations: text(), // Aanbevelingen voor verbetering
});

// ============================================
// AI & TOOLBOXES
// ============================================

// AI Analyses - analyses van veiligheidsmeldingen door AI
export const aiAnalysesTable = pgTable("ai_analyses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  analysisId: varchar({ length: 50 }).notNull().unique(),
  
  // Koppeling naar incident(en)
  incidentIds: text().notNull(), // JSON array van incident IDs
  
  // AI output
  summary: text().notNull(), // Samenvatting van de analyse
  recommendations: text().notNull(), // JSON array van aanbevelingen
  suggestedToolboxTopics: text().notNull(), // JSON array van voorgestelde toolbox onderwerpen
  riskAssessment: text(), // Uitgebreide risico inschatting
  preventiveMeasures: text(), // JSON array van voorkomende maatregelen
  
  // Metadata
  model: varchar({ length: 50 }).default('gpt-4'), // Welk AI model gebruikt
  tokensUsed: integer(), // Aantal tokens gebruikt
  
  createdBy: varchar({ length: 255 }).notNull(), // Clerk User ID
  createdAt: timestamp().defaultNow().notNull(),
});

// Toolboxes - toolboxen voor verschillende onderwerpen
export const toolboxesTable = pgTable("toolboxes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  toolboxId: varchar({ length: 50 }).notNull().unique(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  category: varchar({ length: 100 }).notNull(), // Bijv. "veiligheid", "onderhoud", etc.
  topic: varchar({ length: 255 }), // Het onderwerp waar deze toolbox voor is
  
  // Organisatie en project koppeling
  organizationId: integer().references(() => organizationsTable.id, { onDelete: "set null" }),
  projectId: integer().references(() => projectsTable.id, { onDelete: "set null" }),
  
  // AI generatie info
  aiGenerated: boolean().default(false), // Of deze toolbox door AI is gegenereerd
  sourceIncidentIds: text(), // JSON array van incident IDs waarop dit gebaseerd is
  aiAdvice: text(), // Het AI advies dat heeft geleid tot deze toolbox
  
  // Toolbox inhoud
  items: text().notNull(), // JSON array van toolbox items
  
  // Eigenaar
  createdBy: varchar({ length: 255 }).notNull(), // Clerk User ID
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

// Incident Actions - acties die gekoppeld zijn aan veiligheidsincidenten
export const incidentActionsTable = pgTable("incident_actions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  actionId: varchar({ length: 50 }).notNull().unique(), // Uniek actie ID (bijv. ACT-2024-001)
  
  // Koppeling naar incident
  incidentId: integer().notNull().references(() => safetyIncidentsTable.id, { onDelete: "cascade" }),
  
  // Koppeling naar analyse (optioneel - als actie vanuit AI analyse komt)
  analysisId: integer().references(() => aiAnalysesTable.id, { onDelete: "set null" }),
  
  // Actie details
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  priority: varchar({ length: 50 }).default('medium'), // low, medium, high, urgent
  
  // Status
  status: varchar({ length: 50 }).default('suggested'), // suggested, approved, in_progress, completed, cancelled
  
  // Actiehouder
  actionHolder: varchar({ length: 255 }), // Naam van de actiehouder
  actionHolderEmail: varchar({ length: 255 }), // Email van de actiehouder
  
  // Deadline
  deadline: timestamp(), // Deadline voor de actie
  
  // Metadata
  aiSuggested: boolean().default(false), // Of deze actie door AI is voorgesteld
  originalSuggestion: text(), // Originele AI suggestie (voor referentie)
  approvedBy: varchar({ length: 255 }), // Clerk User ID van degene die heeft goedgekeurd
  approvedAt: timestamp(), // Wanneer is de actie goedgekeurd
  createdBy: varchar({ length: 255 }).notNull(), // Clerk User ID van creator
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
  completedAt: timestamp(), // Wanneer is de actie voltooid
});

