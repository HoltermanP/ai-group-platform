import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Gebruik NEON_DATABASE_URL als die bestaat (voor serverless), anders DATABASE_URL
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is not set');
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

const cleanDatabaseUrl = cleanNeonUrl(databaseUrl);

const sql = neon(cleanDatabaseUrl);
export const db = drizzle({ client: sql });

