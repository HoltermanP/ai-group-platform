import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Clean de connection string - verwijder channel_binding parameter
const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder';
const cleanDatabaseUrl = databaseUrl.replace(/[&?]channel_binding=\w+/g, '');

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: cleanDatabaseUrl,
  },
});

