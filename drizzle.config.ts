import { defineConfig } from 'drizzle-kit';

// Solo para `drizzle-kit generate` (no necesita base). Las migraciones se APLICAN con `scripts/migrate.mjs`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/db/schema.ts',
  out: './drizzle',
});
