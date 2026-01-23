import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Laad environment variabelen expliciet
config({ path: '.env.local' });

// Drizzle Kit configuratie voor Neon database
const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder';

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});

