import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { env } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prismaClient ||
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.__prismaClient = prisma;
}

export async function checkDatabaseConnection(): Promise<{ ok: boolean; message?: string }> {
  try {
    // Simple raw query to verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    logger.error('Database connection check failed', 'Database', { error: message });
    return { ok: false, message };
  }
}
