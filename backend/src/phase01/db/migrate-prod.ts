import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { connectDatabase } from './client.js';
import { log, config } from '../config.js';

/**
 * Production Migration Runner for Blindspot AI
 * Applies forward-only SQL migrations safely to managed PostgreSQL instances.
 * Records migration state in `blindspot_phase01_migrations` schema.
 */
async function runProductionMigration() {
  if (!config.DATABASE_URL) {
    log.error('DATABASE_URL is required to run production migrations.');
    process.exit(1);
  }

  log.info({ env: config.NODE_ENV }, 'Initiating production database migration...');

  const { db, pool } = await connectDatabase();
  try {
    const migrationsFolder = resolve(process.cwd(), 'src/phase01/db/migrations');
    await migrate(db as any, {
      migrationsFolder,
      migrationsSchema: 'blindspot_phase01_migrations',
    });

    log.info('Production migrations applied successfully.');
  } catch (error) {
    log.error({ error }, 'Production migration encountered an error.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void runProductionMigration();
