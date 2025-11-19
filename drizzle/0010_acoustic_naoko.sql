CREATE TABLE "critical_incident_recipients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "critical_incident_recipients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clerkUserId" varchar(255) NOT NULL,
	"phoneNumber" varchar(50),
	"enabled" boolean DEFAULT true,
	"addedBy" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "critical_incident_recipients_clerkUserId_unique" UNIQUE("clerkUserId")
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"recipientType" varchar(50) NOT NULL,
	"recipientId" varchar(255) NOT NULL,
	"channels" text NOT NULL,
	"filters" text NOT NULL,
	"organizationId" integer,
	"enabled" boolean DEFAULT true,
	"createdBy" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clerkUserId" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"incidentId" integer,
	"read" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "projectColumns" text;--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_incidentId_safety_incidents_id_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."safety_incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_critical_recipients_user_id" ON "critical_incident_recipients" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX "idx_critical_recipients_enabled" ON "critical_incident_recipients" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_notification_rules_recipient_type" ON "notification_rules" USING btree ("recipientType");--> statement-breakpoint
CREATE INDEX "idx_notification_rules_recipient_id" ON "notification_rules" USING btree ("recipientId");--> statement-breakpoint
CREATE INDEX "idx_notification_rules_organization_id" ON "notification_rules" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_notification_rules_enabled" ON "notification_rules" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("createdAt");