-- ============================================
-- MANUAL SCHEMA UPDATE
-- Voer dit uit in je Neon database console
-- ============================================

-- 1. Voeg organizationId toe aan projects tabel
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS "organizationId" integer 
REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Voeg organizationId toe aan safety_incidents tabel  
ALTER TABLE safety_incidents 
ADD COLUMN IF NOT EXISTS "organizationId" integer 
REFERENCES organizations(id) ON DELETE SET NULL;

-- 3. Voeg defaultOrganizationId toe aan user_preferences tabel
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS "defaultOrganizationId" integer 
REFERENCES organizations(id) ON DELETE SET NULL;

-- 4. Update projecten met organisatie namen
-- Let op: Dit vult de organizationId kolom op basis van de organization naam (tekst veld)

-- AI Group projecten
UPDATE projects 
SET "organizationId" = 1 
WHERE organization LIKE '%AI Group%' OR organization LIKE '%ai-group%';

-- Van Gelder projecten
UPDATE projects 
SET "organizationId" = 2 
WHERE organization LIKE '%Van Gelder%' OR organization LIKE '%Gelder%';

-- HANAB projecten
UPDATE projects 
SET "organizationId" = 3 
WHERE organization LIKE '%HANAB%';

-- Liander projecten
UPDATE projects 
SET "organizationId" = 4 
WHERE organization LIKE '%Liander%';

-- Of verdeel random als organization veld leeg is
UPDATE projects 
SET "organizationId" = (CASE 
  WHEN MOD(id, 4) = 0 THEN 1
  WHEN MOD(id, 4) = 1 THEN 2
  WHEN MOD(id, 4) = 2 THEN 3
  ELSE 4
END)
WHERE "organizationId" IS NULL;

-- 5. Update safety incidents met organizationId via hun project
UPDATE safety_incidents si
SET "organizationId" = p."organizationId"
FROM projects p
WHERE si."projectId" = p.id
AND si."organizationId" IS NULL;

-- Verificatie queries
SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Projects with org', COUNT(*) FROM projects WHERE "organizationId" IS NOT NULL
UNION ALL
SELECT 'Incidents with org', COUNT(*) FROM safety_incidents WHERE "organizationId" IS NOT NULL;

SELECT 
  o.name as organization,
  COUNT(p.id) as projects,
  COUNT(si.id) as incidents
FROM organizations o
LEFT JOIN projects p ON p."organizationId" = o.id
LEFT JOIN safety_incidents si ON si."organizationId" = o.id
GROUP BY o.id, o.name
ORDER BY o.id;

