// Run from the workspace root with:
// repositories/blindspot-ai/backend/node_modules/.bin/vitest run --config tests/history-client.config.ts
export default {
  test: { include: ['tests/history-client.test.ts'], maxWorkers: 1 },
};
