import { integer, pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

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
  theme: varchar({ length: 50 }).default('theme-slate'),
  language: varchar({ length: 10 }).default('nl'),
  emailNotifications: boolean().default(true),
  defaultOrganizationId: integer().references(() => organizationsTable.id, { onDelete: "set null" }), // Standaard organisatie
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

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
  infrastructureType: varchar({ length: 50 }), // elektra, gas, water, media
  
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
  
  // Infrastructuur specifiek
  infrastructureType: varchar({ length: 100 }), // riool, water, gas, elektra, telecom, metro, tunnel, etc.
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
  
  // Metadata
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

