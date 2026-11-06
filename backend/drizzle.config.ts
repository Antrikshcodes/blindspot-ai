import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/phase01/db/schema.ts',
  out: './src/phase01/db/migrations',
  schemaFilter: ['blindspot_phase01'],
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
