import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Clean de connection string - verwijder channel_binding parameter
// omdat @neondatabase/serverless dit niet ondersteunt
const cleanDatabaseUrl = process.env.DATABASE_URL.replace(/[&?]channel_binding=\w+/g, '');

const sql = neon(cleanDatabaseUrl);
export const db = drizzle({ client: sql });

