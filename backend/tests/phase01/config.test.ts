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
});
