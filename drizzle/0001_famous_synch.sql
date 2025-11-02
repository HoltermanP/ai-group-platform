CREATE TABLE "ai_analyses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_analyses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"analysisId" varchar(50) NOT NULL,
	"incidentIds" text NOT NULL,
	"summary" text NOT NULL,
	"recommendations" text NOT NULL,
	"suggestedToolboxTopics" text NOT NULL,
	"riskAssessment" text,
	"preventiveMeasures" text,
	"model" varchar(50) DEFAULT 'gpt-4',
	"tokensUsed" integer,
	"createdBy" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_analyses_analysisId_unique" UNIQUE("analysisId")
);
--> statement-breakpoint
CREATE TABLE "toolboxes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "toolboxes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"toolboxId" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"topic" varchar(255),
	"organizationId" integer,
	"projectId" integer,
	"aiGenerated" boolean DEFAULT false,
	"sourceIncidentIds" text,
	"aiAdvice" text,
	"items" text NOT NULL,
	"createdBy" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "toolboxes_toolboxId_unique" UNIQUE("toolboxId")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "coordinates" varchar(50);--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD COLUMN "toolboxPresentations" text;--> statement-breakpoint
ALTER TABLE "toolboxes" ADD CONSTRAINT "toolboxes_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toolboxes" ADD CONSTRAINT "toolboxes_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;