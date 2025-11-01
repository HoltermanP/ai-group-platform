import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Neon serverless driver gebruikt HTTP en heeft een directe (niet-pooled) connection string nodig
// Verwijder query parameters en converteer pooled connection naar direct connection
let cleanDatabaseUrl = process.env.DATABASE_URL.split('?')[0];

// Verwijder -pooler uit de hostname voor serverless/HTTP gebruik
// Pooled connections zijn voor traditionele PostgreSQL clients
cleanDatabaseUrl = cleanDatabaseUrl.replace('-pooler.', '.');

const sql = neon(cleanDatabaseUrl);
export const db = drizzle({ client: sql });

