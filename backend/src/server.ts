import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/database.js';

const server = app.listen(env.PORT, () => {
  logger.info(
    `🚀 Blindspot AI Backend listening on port ${env.PORT} [${env.NODE_ENV}]`,
    'Server'
  );
  logger.info(
    `🔗 Health check available at: http://localhost:${env.PORT}${env.API_PREFIX}/health`,
    'Server'
  );
});
