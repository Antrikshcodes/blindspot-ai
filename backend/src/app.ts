import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendError } from './utils/response.js';
import { healthRouter } from './modules/health/health.routes.js';

export function createApp(): Express {
  const app: Express = express();

  // Basic security and parsing middleware
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logger
  app.use(requestLogger);

  // Mount API V1 routes
  const apiRouter = express.Router();
  apiRouter.use('/health', healthRouter);

  // Root API prefix
  app.use(env.API_PREFIX, apiRouter);

  // 404 handler for undefined routes
  app.use((req: Request, res: Response) => {
    sendError(res, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`, 404);
  });

  return app;
}
