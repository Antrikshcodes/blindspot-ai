import { drizzle as nodeDrizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { config, ApiError, log } from '../config.js';

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseConnection {
  db: Database;
  pool: {
    on(event: string, listener: (...args: any[]) => void): any;
    end(): Promise<any>;
  };
}

export async function connectDatabase(): Promise<DatabaseConnection> {
  if (config.DATABASE_URL && /^postgres(ql)?:\/\//.test(config.DATABASE_URL)) {
    const pool = new Pool({
      connectionString: config.DATABASE_URL, max: 10,
      connectionTimeoutMillis: 5000, statement_timeout: 10000,
    });
    return { db: nodeDrizzle(pool, { schema }), pool };
  }

  if (config.NODE_ENV === 'production') {
    throw new ApiError(503, 'DATABASE_NOT_CONFIGURED', 'A PostgreSQL DATABASE_URL is required.');
  }

  log.info('DATABASE_URL not configured. Initializing embedded PGlite for local development.');
  const client = new PGlite();
  const metaPath = resolve(process.cwd(), 'src/phase01/db/migrations/meta/_journal.json');
  if (existsSync(metaPath)) {
    const journal = JSON.parse(readFileSync(metaPath, 'utf8'));
    for (const entry of journal.entries) {
      const sqlFile = resolve(process.cwd(), `src/phase01/db/migrations/${entry.tag}.sql`);
      if (existsSync(sqlFile)) {
        await client.exec(readFileSync(sqlFile, 'utf8'));
      }
    }
  }

  const poolMock = {
    on: () => poolMock,
    end: async () => { await client.close(); },
  };

  return { db: pgliteDrizzle(client, { schema }) as unknown as Database, pool: poolMock };
}
