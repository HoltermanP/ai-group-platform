import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Check of we in een build omgeving zijn (Next.js build process)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                   (process.env.NODE_ENV === 'production' && !process.env.VERCEL && typeof window === 'undefined');

// Helper functie om build-time execution te voorkomen
export function preventBuildTimeExecution() {
  if (isBuildTime) {
    throw new Error('This API route cannot be executed during build time');
  }
}

// Neon serverless driver gebruikt HTTP en verwacht een specifiek URL formaat
// Parse de DATABASE_URL en reconstrueer zonder query parameters en zonder -pooler
function cleanNeonUrl(url: string): string {
  try {
    // Verwijder eerst alle query parameters
    const baseUrl = url.split('?')[0];

    // Parse de URL
    const urlObj = new URL(baseUrl);

    // Verwijder -pooler uit hostname voor serverless gebruik
    if (urlObj.hostname.includes('-pooler.')) {
      urlObj.hostname = urlObj.hostname.replace('-pooler.', '.');
    }

    // Retourneer de schone URL (URL object zorgt automatisch voor correcte encoding)
    return urlObj.href;
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    // Fallback naar simple string replacement
    return url.split('?')[0].replace('-pooler.', '.');
  }
}

// Lazy database initialisatie - alleen initialiseren wanneer daadwerkelijk nodig
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (isBuildTime) {
    throw new Error('Database operations are not available during build time');
  }

  if (!dbInstance) {
    // Gebruik NEON_DATABASE_URL als die bestaat (voor serverless), anders DATABASE_URL
    const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is not set');
    }

    const cleanDatabaseUrl = cleanNeonUrl(databaseUrl);
    const sql = neon(cleanDatabaseUrl);
    dbInstance = drizzle({ client: sql });
  }

  return dbInstance;
}

// Voor backwards compatibility - maak een build-time safe proxy
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    if (isBuildTime) {
      return () => {
        throw new Error('Database operations are not available during build time');
      };
    }
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});

