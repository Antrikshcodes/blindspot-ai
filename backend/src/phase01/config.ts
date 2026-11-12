import 'dotenv/config';
import { z } from 'zod';
import pino from 'pino';

// Empty optional placeholders in a copied .env.example must behave as omitted.
const optionalSecret = z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional());
const optionalUrl = z.preprocess(value => value === '' ? undefined : value, z.string().url().optional());
export const config = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: optionalSecret,
  AI_PROVIDER: z.enum(['replit', 'openai', 'disabled']).default('replit'),
  AI_API_KEY: optionalSecret,
  AI_BASE_URL: optionalUrl,
  AI_MODEL: z.string().default('gpt-5.4-mini'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(100).max(120000).default(45000),
  AI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(3).default(2),
  AI_INTEGRATIONS_OPENAI_BASE_URL: optionalUrl,
  AI_INTEGRATIONS_OPENAI_API_KEY: optionalSecret,
  GITHUB_TOKEN: optionalSecret,
  HUGGINGFACE_TOKEN: optionalSecret,
  KAGGLE_USERNAME: optionalSecret,
  KAGGLE_KEY: optionalSecret,
  KAGGLE_ENABLED: z.enum(['true', 'false']).default('false'),
  CACHE_TTL: z.coerce.number().int().min(1).max(86400).default(900),
  API_RATE_LIMIT: z.coerce.number().int().min(1).max(10000).default(120),
  AI_RATE_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  EXTERNAL_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(8000),
  PROVIDER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(3),
  PROVIDER_PAGE_SIZE: z.coerce.number().int().min(1).max(10).default(5),
  RESOURCE_RESULT_LIMIT: z.coerce.number().int().min(1).max(40).default(24),
  RANK_WEIGHTS: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
}).parse(process.env);

export function validateProductionConfig(): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (config.NODE_ENV === 'production') {
    if (!config.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production mode');
    }
    if (!process.env.CLERK_SECRET_KEY) {
      errors.push('CLERK_SECRET_KEY is required in production mode');
    }
    if (!process.env.CLERK_PUBLISHABLE_KEY) {
      warnings.push('CLERK_PUBLISHABLE_KEY is recommended in production');
    }
    if (config.AI_PROVIDER === 'openai' && !config.AI_API_KEY && !config.AI_INTEGRATIONS_OPENAI_API_KEY) {
      warnings.push('AI_PROVIDER is openai but AI_API_KEY is not set');
    }
    if (config.CORS_ORIGIN === '*') {
      warnings.push('CORS_ORIGIN is set to wildcard *; specify the production frontend domain for enhanced security');
    }
  }

  return { valid: errors.length === 0, warnings, errors };
}

export const log = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.apiKey', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
});
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
