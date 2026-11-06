import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const logMsg = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      logger.error(logMsg, 'HTTP');
    } else if (statusCode >= 400) {
      logger.warn(logMsg, 'HTTP');
    } else {
      logger.info(logMsg, 'HTTP');
    }
  });

  next();
}
