import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('Configuration from a copied environment template', () => {
  it('allows blank optional credentials while AI is disabled', () => {
    const output = execFileSync(process.execPath, [
      '--import', 'tsx', '--eval',
      "import { config } from './src/phase01/config.ts'; if (config.AI_API_KEY !== undefined) process.exit(1); console.log('config-valid');",
    ], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test', AI_PROVIDER: 'disabled', AI_API_KEY: '',
        GITHUB_TOKEN: '', HUGGINGFACE_TOKEN: '', KAGGLE_USERNAME: '', KAGGLE_KEY: '', AI_BASE_URL: '' },
      encoding: 'utf8',
    });
    expect(output.trim()).toBe('config-valid');
  });

  it('blocks production startup without a secure database, Clerk, AI, and exact browser origins', () => {
    const output = execFileSync(process.execPath, [
      '--import', 'tsx', '--eval',
      "import { validateProductionConfig } from './src/phase01/config.ts'; console.log(JSON.stringify(validateProductionConfig()));",
    ], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'postgresql://user:pass@db.example/app',
        AI_PROVIDER: 'disabled', CORS_ORIGIN: '*', CLERK_SECRET_KEY: '', CLERK_PUBLISHABLE_KEY: '' },
      encoding: 'utf8',
    });
    const result = JSON.parse(output.trim());
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('sslmode'),
      expect.stringContaining('CLERK_SECRET_KEY'),
      expect.stringContaining('CLERK_PUBLISHABLE_KEY'),
      expect.stringContaining('AI_PROVIDER=disabled'),
      expect.stringContaining('CORS_ORIGIN'),
    ]));
  });

  it('accepts a complete production configuration using explicit frontend origins', () => {
    const output = execFileSync(process.execPath, [
      '--import', 'tsx', '--eval',
      "import { validateProductionConfig } from './src/phase01/config.ts'; console.log(JSON.stringify(validateProductionConfig()));",
    ], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'postgresql://user:pass@db.example/app?sslmode=require',
        AI_PROVIDER: 'openai', AI_API_KEY: 'test-key', CORS_ORIGIN: 'https://app.example.com',
        CLERK_SECRET_KEY: 'sk_live_fixture', CLERK_PUBLISHABLE_KEY: 'pk_live_fixture' },
      encoding: 'utf8',
    });
    expect(JSON.parse(output.trim())).toEqual({ valid: true, warnings: [], errors: [] });
  });
});
