-- SQL Script om handmatig de nieuwe tabellen aan te maken
-- Dit kun je uitvoeren in je Neon database console

-- 1. Maak organizations tabel aan
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "description" text,
  "logo" text,
  "website" varchar(255),
  "contactEmail" varchar(255),
  "contactPhone" varchar(50),
  "address" text,
  "status" varchar(50) DEFAULT 'active',
  "createdBy" varchar(255) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- 2. Maak user_roles tabel aan
CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "clerkUserId" varchar(255) NOT NULL UNIQUE,
  "role" varchar(50) NOT NULL DEFAULT 'user',
  "assignedBy" varchar(255),
  "assignedAt" timestamp DEFAULT now() NOT NULL,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- 3. Maak organization_members tabel aan
CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "organizationId" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "clerkUserId" varchar(255) NOT NULL,
  "role" varchar(50) NOT NULL DEFAULT 'member',
  "permissions" text,
  "invitedBy" varchar(255),
  "joinedAt" timestamp DEFAULT now() NOT NULL,
  "status" varchar(50) DEFAULT 'active',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- 4. Voeg organizationId toe aan projects (nullable voor bestaande records)
ALTER TABLE "projects" 
ADD COLUMN IF NOT EXISTS "organizationId" integer 
REFERENCES "organizations"("id") ON DELETE CASCADE;

-- 5. Voeg organizationId toe aan safety_incidents
ALTER TABLE "safety_incidents" 
ADD COLUMN IF NOT EXISTS "organizationId" integer 
REFERENCES "organizations"("id") ON DELETE SET NULL;

-- 6. Update user_preferences met defaultOrganizationId
ALTER TABLE "user_preferences" 
ADD COLUMN IF NOT EXISTS "defaultOrganizationId" integer 
REFERENCES "organizations"("id") ON DELETE SET NULL;

-- 7. Optioneel: Maak een eerste organisatie aan
-- INSERT INTO "organizations" (name, slug, description, "createdBy")
-- VALUES ('AI Group', 'ai-group', 'Hoofd organisatie', 'YOUR_CLERK_USER_ID_HERE');

-- 8. Optioneel: Maak jezelf admin
-- INSERT INTO "user_roles" ("clerkUserId", role, "assignedBy")
-- VALUES ('YOUR_CLERK_USER_ID_HERE', 'super_admin', 'YOUR_CLERK_USER_ID_HERE');

