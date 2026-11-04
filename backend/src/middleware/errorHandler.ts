import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, sendError } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.message, 'ErrorHandler', {
    name: err.name,
    stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Handle custom AppError
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 400, details);
    return;
  }

  // Handle Prisma database errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(', ')
        : 'field';
      sendError(res, 'DUPLICATE_RECORD', `A record with this ${target} already exists`, 409);
      return;
    }
    // Record not found
    if (err.code === 'P2025') {
      sendError(res, 'NOT_FOUND', 'Requested resource was not found', 404);
      return;
    }
    sendError(res, 'DATABASE_ERROR', 'A database error occurred', 500);
    return;
  }

  // Fallback for unhandled unexpected errors
  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected server error occurred'
      : err.message || 'Internal server error';

  sendError(res, 'INTERNAL_SERVER_ERROR', message, 500);
}
