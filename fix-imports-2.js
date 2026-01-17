const fs = require('fs');
const path = require('path');

// Table mapping
const tableMapping = {
  'certificatesTable': 'certificatesTable',
  'organizationsTable': 'organizationsTable',
  'userRolesTable': 'userRolesTable',
  'organizationMembersTable': 'organizationMembersTable',
  'userPreferencesTable': 'userPreferencesTable',
  'userModulePermissionsTable': 'userModulePermissionsTable',
  'projectsTable': 'projectsTable',
  'projectMembersTable': 'projectMembersTable',
  'projectDocumentsTable': 'projectDocumentsTable',
  'safetyIncidentsTable': 'safetyIncidentsTable',
  'inspectionsTable': 'inspectionsTable',
  'supervisionsTable': 'supervisionsTable',
  'aiAnalysesTable': 'aiAnalysesTable',
  'toolboxesTable': 'toolboxesTable',
  'incidentActionsTable': 'incidentActionsTable',
  'projectTasksTable': 'projectTasksTable',
  'userCertificatesTable': 'userCertificatesTable',
  'criticalIncidentRecipientsTable': 'criticalIncidentRecipientsTable',
  'notificationsTable': 'notificationsTable',
  'notificationRulesTable': 'notificationRulesTable'
};

// Function to find tables used in a file
function findTablesUsed(content) {
  const usedTables = new Set();

  for (const [key, table] of Object.entries(tableMapping)) {
    if (content.includes(table)) {
      usedTables.add(table);
    }
  }

  return Array.from(usedTables);
}

// Function to fix imports in a file
function fixImports(filePath) {
  console.log(`Processing ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already fixed (no top-level db import)
  if (!content.includes("import { db } from '@/lib/db';")) {
    console.log(`  Skipping ${filePath} - already fixed`);
    return;
  }

  // Find which tables are used
  const usedTables = findTablesUsed(content);
  const tablesImport = usedTables.length > 0 ? `{ ${usedTables.join(', ')} }` : '{}';

  // Check if drizzle functions are used
  const drizzleFunctions = [];
  if (content.includes(' eq(')) drizzleFunctions.push('eq');
  if (content.includes(' desc(')) drizzleFunctions.push('desc');
  if (content.includes(' and(')) drizzleFunctions.push('and');
  if (content.includes(' or(')) drizzleFunctions.push('or');
  if (content.includes(' like(')) drizzleFunctions.push('like');
  if (content.includes(' ilike(')) drizzleFunctions.push('ilike');
  if (content.includes(' asc(')) drizzleFunctions.push('asc');
  if (content.includes(' sql(')) drizzleFunctions.push('sql');

  const drizzleImport = drizzleFunctions.length > 0 ? `{ ${drizzleFunctions.join(', ')} }` : '{}';

  // Remove top-level imports
  content = content.replace(/import { db } from '@\/lib\/db';\n/g, '');
  content = content.replace(/import { [^}]* } from '@\/lib\/db\/schema';\n/g, '');
  content = content.replace(/import { [^}]* } from 'drizzle-orm';\n/g, '');

  // Add imports to each function
  content = content.replace(
    /(export async function \w+\([^}]*\)\s*{\s*try\s*\{)/g,
    `$1\n    const { db } = await import('@/lib/db');\n    const ${tablesImport} = await import('@/lib/db/schema');\n    const ${drizzleImport} = await import('drizzle-orm');\n`
  );

  fs.writeFileSync(filePath, content);
  console.log(`  Fixed ${filePath} - tables: ${usedTables.join(', ')}`);
}

// Function to find all route.ts files
function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

// Main execution
const routeFiles = findRouteFiles('app/api');
console.log(`Found ${routeFiles.length} route files`);

routeFiles.forEach(fixImports);
console.log('Done!');