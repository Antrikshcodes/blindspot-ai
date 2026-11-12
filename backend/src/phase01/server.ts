import { createApp } from './app.js';
import { createLLM } from './ai/provider.js';
import { connectDatabase } from './db/client.js';
import { defaultProviders } from './resource-intelligence/providers.js';
import { config, log, validateProductionConfig } from './config.js';

async function start() {
  const envValidation = validateProductionConfig();
  if (envValidation.warnings.length > 0) {
    log.warn({ warnings: envValidation.warnings }, 'Production environment warnings detected');
  }
  if (!envValidation.valid) {
    log.error({ errors: envValidation.errors }, 'Production environment validation failed');
    process.exit(1);
  }

  const { db, pool } = await connectDatabase();
  pool.on('error', () => log.error('Database pool connection error'));
  const app = createApp({ db, llm: createLLM(), providers: defaultProviders() });
  const server = app.listen(config.PORT, '0.0.0.0', () => {
    log.info({ port: config.PORT, mode: config.NODE_ENV }, 'Blindspot Phase 01 API listening');
  });
  const shutdown = () => {
    const force = setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => { void pool.end().finally(() => { clearTimeout(force); process.exit(0); }); });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

start().catch(err => {
  log.error({ err }, 'Failed to start Phase 01 API server');
  process.exit(1);
});
