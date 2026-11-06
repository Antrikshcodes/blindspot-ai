import { Response } from 'express';

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  timestamp: string;
}

/**
 * Sends a standardized JSON success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response<ApiResponse<T>> {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}

/**
 * Sends a standardized JSON error response.
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown[]
): Response<ApiErrorResponse> {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 && { details }),
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
