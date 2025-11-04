CREATE TABLE "incident_actions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "incident_actions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"actionId" varchar(50) NOT NULL,
	"incidentId" integer NOT NULL,
	"analysisId" integer,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"priority" varchar(50) DEFAULT 'medium',
	"status" varchar(50) DEFAULT 'suggested',
	"actionHolder" varchar(255),
	"actionHolderEmail" varchar(255),
	"deadline" timestamp,
	"aiSuggested" boolean DEFAULT false,
	"originalSuggestion" text,
	"approvedBy" varchar(255),
	"approvedAt" timestamp,
	"createdBy" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "incident_actions_actionId_unique" UNIQUE("actionId")
);
--> statement-breakpoint
ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_incidentId_safety_incidents_id_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."safety_incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_actions" ADD CONSTRAINT "incident_actions_analysisId_ai_analyses_id_fk" FOREIGN KEY ("analysisId") REFERENCES "public"."ai_analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_clerkUserId_module_unique" UNIQUE("clerkUserId","module");