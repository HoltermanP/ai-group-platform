import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Clean de connection string - verwijder alle query parameters
const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder';
const cleanDatabaseUrl = databaseUrl.split('?')[0];

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: cleanDatabaseUrl,
  },
});

