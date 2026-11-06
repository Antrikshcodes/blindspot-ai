import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { connectDatabase } from './client.js';
import { log, config } from '../config.js';

// Development-only, explicit command; never executed at server startup.
// Replit-managed production schema changes belong to the Publish flow.
if (config.NODE_ENV === 'production') throw new Error('Use the managed production schema release flow, not this development command.');

async function runMigrate() {
  const { db, pool } = await connectDatabase();
  try {
    await migrate(db as any, { migrationsFolder: resolve(process.cwd(), 'src/phase01/db/migrations'), migrationsSchema: 'blindspot_phase01_migrations' });
    log.info('Development migrations applied');
  } catch (error) {
    log.error({ error }, 'Development migration failed');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void runMigrate();
