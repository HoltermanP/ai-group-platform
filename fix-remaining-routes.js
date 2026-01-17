const fs = require('fs');
const path = require('path');

// Function to find all route files that still have top-level db imports
function findUnfixedRoutes(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findUnfixedRoutes(fullPath, files);
    } else if (item === 'route.ts') {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes("import { db } from '@/lib/db';")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// Function to find all routes that have db usage without proper imports
function findRoutesWithDbUsage(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findRoutesWithDbUsage(fullPath, files);
    } else if (item === 'route.ts') {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Check if file uses db but doesn't have the lazy import pattern
      if (content.includes('await db') && !content.includes('const { db } = await import')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// Function to fix a route by adding proper imports
function fixRoute(filePath) {
  console.log(`Fixing ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');

  // Remove top-level db imports
  content = content.replace(/import { db } from '@\/lib\/db';\n/g, '');
  content = content.replace(/import { [^}]* } from '@\/lib\/db\/schema';\n/g, '');
  content = content.replace(/import { [^}]* } from 'drizzle-orm';\n/g, '');

  // Find all table usages in the file
  const tableMatches = content.match(/\w+Table/g) || [];
  const uniqueTables = [...new Set(tableMatches)].filter(table =>
    table !== 'Table' && !table.includes('sql') && !table.includes('and') && !table.includes('eq')
  );

  // Find drizzle function usages
  const drizzleMatches = content.match(/\b(eq|and|or|like|ilike|desc|asc|sql)\s*\(/g) || [];
  const uniqueDrizzleFuncs = [...new Set(drizzleMatches.map(match => match.replace(/\s*\($/, '')))];

  // Add imports to each function
  const tablesImport = uniqueTables.length > 0 ? `{ ${uniqueTables.join(', ')} }` : '{}';
  const drizzleImport = uniqueDrizzleFuncs.length > 0 ? `{ ${uniqueDrizzleFuncs.join(', ')} }` : '{}';

  content = content.replace(
    /(export async function \w+\([^}]*\)\s*{\s*try\s*\{)/g,
    `$1\n    const { db } = await import('@/lib/db');\n    const ${tablesImport} = await import('@/lib/db/schema');\n    const ${drizzleImport} = await import('drizzle-orm');\n`
  );

  fs.writeFileSync(filePath, content);
  console.log(`  Fixed with tables: ${uniqueTables.join(', ')}, drizzle: ${uniqueDrizzleFuncs.join(', ')}`);
}

// Main execution
console.log('Finding routes that still need fixing...');
const unfixedRoutes = findRoutesWithDbUsage('app/api');
console.log(`Found ${unfixedRoutes.length} routes that need fixing`);

unfixedRoutes.forEach(fixRoute);
console.log('Done!');