import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Function to find all API route files
function findApiRoutes(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findApiRoutes(fullPath, files);
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(fullPath);
    }
  }

  return files;
}

// Function to fix a single route file
function fixRouteFile(filePath: string): void {
  console.log(`Processing ${filePath}`);

  let content = readFileSync(filePath, 'utf-8');

  // Check if file already has db import at top level
  if (!content.includes("import { db } from '@/lib/db';")) {
    console.log(`  Skipping ${filePath} - no top-level db import found`);
    return;
  }

  // Remove top-level db imports
  content = content.replace(/import { db } from '@\/lib\/db';\n/g, '');
  content = content.replace(/import { [^}]* } from '@\/lib\/db\/schema';\n/g, '');
  content = content.replace(/import { [^}]* } from 'drizzle-orm';\n/g, '');

  // Find all export async function declarations
  const functionRegex = /export async function (\w+)\([^}]*\)\s*{/g;
  let match;
  const functions: string[] = [];

  while ((match = functionRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  // For each function, add the required imports at the beginning
  for (const funcName of functions) {
    const funcRegex = new RegExp(`(export async function ${funcName}\\([^}]*\\)\\s*{\\s*try\\s*\\{)`, 's');
    const replacement = `$1\n    const { db } = await import('@/lib/db');\n    const { certificatesTable, organizationsTable, userRolesTable, organizationMembersTable, usersTable } = await import('@/lib/db/schema');\n    const { eq, desc, and, or, like, ilike } = await import('drizzle-orm');\n`;

    content = content.replace(funcRegex, replacement);
  }

  writeFileSync(filePath, content);
  console.log(`  Fixed ${filePath}`);
}

// Main execution
const apiDir = 'app/api';
const routeFiles = findApiRoutes(apiDir);

console.log(`Found ${routeFiles.length} API route files`);

for (const file of routeFiles) {
  try {
    fixRouteFile(file);
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
}

console.log('Done!');