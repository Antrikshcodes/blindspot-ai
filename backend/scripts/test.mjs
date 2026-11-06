import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Never run tests against a developer's or a deployed database.
const backend = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'blindspot-tests-'));
const env = {
  ...process.env,
  NODE_ENV: 'test',
  API_PREFIX: '/api/v1',
  DATABASE_URL: `file:${join(directory, 'test.db')}`,
};
const bin = (name) => join(backend, 'node_modules', '.bin', name);
let exitCode = 1;
try {
  for (const [command, args] of [
    ['prisma', ['generate']],
    ['prisma', ['db', 'push', '--skip-generate']],
    ['vitest', ['run', 'tests/database.test.ts', 'tests/error.test.ts', 'tests/health.test.ts', 'tests/library.test.ts', '--maxWorkers=1', '--no-file-parallelism', ...process.argv.slice(2)]],
  ]) {
    const result = spawnSync(bin(command), args, { cwd: backend, env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      exitCode = result.status ?? 1;
      break;
    }
    exitCode = 0;
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
process.exitCode = exitCode;
