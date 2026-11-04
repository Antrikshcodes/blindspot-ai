import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response.js';
import { checkDatabaseConnection } from '../../config/database.js';
import { env } from '../../config/env.js';

export async function getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uptimeSeconds = Math.floor(process.uptime());
    const memoryUsage = process.memoryUsage();

    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${uptimeSeconds}s`,
      environment: env.NODE_ENV,
      version: '1.0.0',
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
    }, 'Blindspot AI Backend is healthy');
  } catch (error) {
    next(error);
  }
}

export async function getReadiness(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dbCheck = await checkDatabaseConnection();

    if (!dbCheck.ok) {
      sendError(
        res,
        'SERVICE_UNAVAILABLE',
        'Database connection is not ready',
        503,
        [{ component: 'database', message: dbCheck.message }]
      );
      return;
    }

    sendSuccess(res, {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    }, 'Backend is ready to accept traffic');
  } catch (error) {
    next(error);
  }
}
