import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';

export function createApp(): Express {
  const app: Express = express();

  // Basic security and parsing middleware
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  return app;
}
