CREATE TABLE "supervisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supervisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"supervisionId" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"projectId" integer NOT NULL,
	"organizationId" integer,
	"discipline" varchar(100),
	"status" varchar(50) DEFAULT 'open',
	"overallQuality" varchar(50),
	"qualityStandards" text,
	"location" text,
	"coordinates" varchar(100),
	"supervisedBy" varchar(255) NOT NULL,
	"assignedTo" varchar(255),
	"supervisionDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"photos" text,
	"notes" text,
	"findings" text,
	"recommendations" text,
	CONSTRAINT "supervisions_supervisionId_unique" UNIQUE("supervisionId")
);
--> statement-breakpoint
CREATE TABLE "user_module_permissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_module_permissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clerkUserId" varchar(255) NOT NULL,
	"module" varchar(50) NOT NULL,
	"granted" boolean DEFAULT true,
	"grantedBy" varchar(255),
	"grantedAt" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supervisions" ADD CONSTRAINT "supervisions_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisions" ADD CONSTRAINT "supervisions_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;