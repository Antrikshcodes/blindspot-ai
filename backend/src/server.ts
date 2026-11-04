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

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down server...`, 'Server');
  server.close(async () => {
    logger.info('HTTP server closed.', 'Server');
    try {
      await prisma.$disconnect();
      logger.info('Database client disconnected.', 'Database');
      process.exit(0);
    } catch (error) {
      logger.error('Error during database disconnect', 'Database', { error });
      process.exit(1);
    }
  });
