import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { config, ApiError } from '../config.js';

export type Database = NodePgDatabase<typeof schema>;
export function connectDatabase(): { db: Database; pool: Pool } {
  if (!config.DATABASE_URL || !/^postgres(ql)?:\/\//.test(config.DATABASE_URL)) {
    throw new ApiError(503, 'DATABASE_NOT_CONFIGURED', 'A PostgreSQL DATABASE_URL is required.');
  }
  const pool = new Pool({
    connectionString: config.DATABASE_URL, max: 10,
    connectionTimeoutMillis: 5000, statement_timeout: 10000,
  });
  return { db: drizzle(pool, { schema }), pool };
}
