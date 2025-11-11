CREATE TABLE "certificates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "certificates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"discipline" varchar(50) NOT NULL,
	"expires" boolean DEFAULT false,
	"validityYears" integer,
	"status" varchar(50) DEFAULT 'active',
	"createdBy" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_certificates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_certificates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"certificateId" integer NOT NULL,
	"clerkUserId" varchar(255) NOT NULL,
	"achievedDate" timestamp NOT NULL,
	"expiryDate" timestamp,
	"status" varchar(50) DEFAULT 'active',
	"notes" text,
	"assignedBy" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_certificates" ADD CONSTRAINT "user_certificates_certificateId_certificates_id_fk" FOREIGN KEY ("certificateId") REFERENCES "public"."certificates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_certificates_discipline" ON "certificates" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "idx_certificates_status" ON "certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_certificates_certificate_id" ON "user_certificates" USING btree ("certificateId");--> statement-breakpoint
CREATE INDEX "idx_user_certificates_clerk_user_id" ON "user_certificates" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX "idx_user_certificates_expiry_date" ON "user_certificates" USING btree ("expiryDate");--> statement-breakpoint
CREATE INDEX "idx_user_certificates_status" ON "user_certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_certificates_user_cert" ON "user_certificates" USING btree ("clerkUserId","certificateId");