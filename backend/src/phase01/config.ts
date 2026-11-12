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
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1'),
}).parse(process.env);

export function validateProductionConfig(): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (config.NODE_ENV === 'production') {
    if (!config.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production mode');
    } else {
      try {
        const databaseUrl = new URL(config.DATABASE_URL);
        if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
          errors.push('DATABASE_URL must use PostgreSQL in production mode');
        }
        if (!['require', 'verify-ca', 'verify-full'].includes(databaseUrl.searchParams.get('sslmode') ?? '')) {
          errors.push('DATABASE_URL must require TLS with sslmode=require, verify-ca, or verify-full');
        }
      } catch {
        errors.push('DATABASE_URL must be a valid PostgreSQL URL in production mode');
      }
    }
    if (!process.env.CLERK_SECRET_KEY) {
      errors.push('CLERK_SECRET_KEY is required in production mode');
    } else if (!process.env.CLERK_SECRET_KEY.startsWith('sk_live_')) {
      errors.push('CLERK_SECRET_KEY must use a live Clerk key in production mode');
    }
    if (!process.env.CLERK_PUBLISHABLE_KEY) {
      errors.push('CLERK_PUBLISHABLE_KEY is required in production mode');
    } else if (!process.env.CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) {
      errors.push('CLERK_PUBLISHABLE_KEY must use a live Clerk key in production mode');
    }
    if (config.AI_PROVIDER === 'openai' && !config.AI_API_KEY && !config.AI_INTEGRATIONS_OPENAI_API_KEY) {
      errors.push('AI_API_KEY is required when AI_PROVIDER=openai in production mode');
    }
    if (config.AI_PROVIDER === 'replit' && (!config.AI_INTEGRATIONS_OPENAI_API_KEY || !config.AI_INTEGRATIONS_OPENAI_BASE_URL)) {
      errors.push('Replit AI integration credentials are required when AI_PROVIDER=replit in production mode');
    }
    if (config.AI_PROVIDER === 'disabled') {
      errors.push('AI_PROVIDER=disabled is not supported for production release readiness');
    }
    if (config.CORS_ORIGIN === '*') {
      errors.push('CORS_ORIGIN must list the exact frontend origins allowed to call the production API');
    } else {
      const origins = config.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean);
      if (origins.length === 0 || origins.some(origin => {
        try {
          const parsed = new URL(origin);
          return parsed.protocol !== 'https:' || parsed.origin !== origin
            || parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost')
            || parsed.hostname === '127.0.0.1' || parsed.hostname.endsWith('.local');
        } catch { return true; }
      })) {
        errors.push('CORS_ORIGIN must contain comma-separated HTTPS origins with no paths');
      }
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
