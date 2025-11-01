import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Drizzle Kit is een CLI tool die een traditionele PostgreSQL client gebruikt
// We verwijderen alleen de query parameters, maar behouden de pooled connection (-pooler)
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

