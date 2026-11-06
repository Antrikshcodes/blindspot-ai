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
  RANK_WEIGHTS: z.string().optional(),
}).parse(process.env);

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
