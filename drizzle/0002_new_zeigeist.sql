CREATE TABLE "inspections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inspections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"inspectionId" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"projectId" integer NOT NULL,
	"organizationId" integer,
	"connectionTypes" varchar(255),
	"status" varchar(50) DEFAULT 'open',
	"readinessStatus" varchar(50),
	"checklist" text,
	"location" text,
	"coordinates" varchar(100),
	"inspectedBy" varchar(255) NOT NULL,
	"assignedTo" varchar(255),
	"inspectionDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"photos" text,
	"notes" text,
	"remarks" text,
	CONSTRAINT "inspections_inspectionId_unique" UNIQUE("inspectionId")
);
--> statement-breakpoint
ALTER TABLE "projects" RENAME COLUMN "infrastructureType" TO "discipline";--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD COLUMN "discipline" varchar(100);--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "timezone" varchar(50) DEFAULT 'Europe/Amsterdam';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "dateFormat" varchar(20) DEFAULT 'DD-MM-YYYY';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "timeFormat" varchar(10) DEFAULT '24h';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "dashboardLayout" varchar(20) DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "itemsPerPage" integer DEFAULT 25;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "defaultDashboardSection" varchar(50);--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "mapSettings" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "notificationPreferences" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "defaultFilters" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "defaultSorting" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "aiAutoAnalysis" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "defaultAIModel" varchar(50) DEFAULT 'gpt-4';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "showAISuggestions" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "autoGenerateToolbox" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "compactMode" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "autoRefresh" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "autoRefreshInterval" integer DEFAULT 30000;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" DROP COLUMN "infrastructureType";