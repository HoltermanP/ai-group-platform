ALTER TABLE "toolboxes" ADD COLUMN "gammaDeckId" varchar(255);--> statement-breakpoint
ALTER TABLE "toolboxes" ADD COLUMN "gammaDeckUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "toolboxes" ADD COLUMN "incidentId" integer;--> statement-breakpoint
ALTER TABLE "toolboxes" ADD CONSTRAINT "toolboxes_incidentId_safety_incidents_id_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."safety_incidents"("id") ON DELETE set null ON UPDATE no action;