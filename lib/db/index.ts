import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Clean de connection string - verwijder alle query parameters
// omdat @neondatabase/serverless HTTP gebruikt en geen traditionele PostgreSQL parameters ondersteunt
const cleanDatabaseUrl = process.env.DATABASE_URL.split('?')[0];

const sql = neon(cleanDatabaseUrl);
export const db = drizzle({ client: sql });

