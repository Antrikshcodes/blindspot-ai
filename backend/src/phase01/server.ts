import { createApp } from './app.js';
import { createLLM } from './ai/provider.js';
import { connectDatabase } from './db/client.js';
import { defaultProviders } from './resource-intelligence/providers.js';
import { config, log } from './config.js';

const { db, pool } = connectDatabase();
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
