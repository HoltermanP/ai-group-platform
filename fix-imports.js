const fs = require('fs');
const path = require('path');

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

// Function to fix imports in a file
function fixImports(filePath) {
  console.log(`Processing ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already fixed
  if (!content.includes("import { db } from '@/lib/db';")) {
    console.log(`  Skipping ${filePath} - already fixed`);
    return;
  }

  // Remove top-level imports
  content = content.replace(/import { db } from '@\/lib\/db';\n/g, '');
  content = content.replace(/import { [^}]* } from '@\/lib\/db\/schema';\n/g, '');
  content = content.replace(/import { [^}]* } from 'drizzle-orm';\n/g, '');

  // Add imports to each function
  content = content.replace(
    /(export async function \w+\([^}]*\)\s*{\s*try\s*\{)/g,
    '$1\n    const { db } = await import(\'@/lib/db\');\n    const { certificatesTable, organizationsTable, userRolesTable, organizationMembersTable, usersTable, userPreferencesTable, safetyIncidentsTable, projectsTable, inspectionsTable, supervisionsTable, toolboxesTable } = await import(\'@/lib/db/schema\');\n    const { eq, desc, and, or, like, ilike, asc, sql } = await import(\'drizzle-orm\');\n'
  );

  fs.writeFileSync(filePath, content);
  console.log(`  Fixed ${filePath}`);
}

// Main execution
const routeFiles = findRouteFiles('app/api');
console.log(`Found ${routeFiles.length} route files`);

routeFiles.forEach(fixImports);
console.log('Done!');