CREATE INDEX "idx_inspections_project_id" ON "inspections" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_inspections_organization_id" ON "inspections" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_inspections_status" ON "inspections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_org_members_org_id" ON "organization_members" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_org_members_user_id" ON "organization_members" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX "idx_org_members_org_user" ON "organization_members" USING btree ("organizationId","clerkUserId");--> statement-breakpoint
CREATE INDEX "idx_projects_organization_id" ON "projects" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_projects_owner_id" ON "projects" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_org_status" ON "projects" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "idx_safety_incidents_project_id" ON "safety_incidents" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_safety_incidents_organization_id" ON "safety_incidents" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_safety_incidents_severity" ON "safety_incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_incidents_project_severity" ON "safety_incidents" USING btree ("projectId","severity");--> statement-breakpoint
CREATE INDEX "idx_safety_incidents_status" ON "safety_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_supervisions_project_id" ON "supervisions" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_supervisions_organization_id" ON "supervisions" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_supervisions_status" ON "supervisions" USING btree ("status");