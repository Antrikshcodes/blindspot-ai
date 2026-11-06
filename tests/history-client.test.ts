import { afterAll, beforeAll, expect, it, vi } from '../repositories/blindspot-ai/backend/node_modules/vitest/dist/index.js';
import { chdir } from 'node:process';
import { fileURLToPath } from 'node:url';
import { authenticatedRequest as request, createAuthenticatedApp as createApp } from '../repositories/blindspot-ai/backend/tests/phase01/auth.fixtures.js';
import { FixtureLLM, isolatedDatabase, projectInput } from '../repositories/blindspot-ai/backend/tests/phase01/fixtures.js';
import { listAnalysisHistory, getAnalysis } from '../lib/api-client-react/src/generated/api.js';

let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
beforeAll(async () => {
  // The product backend remains independently runnable; only this workspace
  // integration test depends on both the backend and the generated browser client.
  chdir(fileURLToPath(new URL('../repositories/blindspot-ai/backend', import.meta.url)));
  storage = await isolatedDatabase();
}, 30000);
afterAll(async () => { vi.unstubAllGlobals(); await storage.client.close(); });

it('loads paginated history and historical details with the generated client across fresh sessions', async () => {
  const llm = new FixtureLLM();
  let app = createApp({ db: storage.db, llm, providers: [] });
  const project = (await request(app).post('/api/projects').send(projectInput)).body.data;
  const first = (await request(app).post(`/api/projects/${project.id}/analyze`).send({})).body.data;
  const second = (await request(app).post(`/api/projects/${project.id}/analyze`).send({})).body.data;
  // Adapt fetch to the real HTTP app. Neither responses nor identities are
  // mocked: authentication still exercises signature verification.
  vi.stubGlobal('fetch', async (url: string) => {
    const res = await request(app).get(url);
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  });
  const recent = await listAnalysisHistory(project.id, { page: 1, limit: 1 });
  expect(recent.data.items.map(row => [row.id, row.version])).toEqual([[second.id, 2]]);
  const older = await listAnalysisHistory(project.id, { page: 2, limit: 1 });
  expect(older.data.items.map(row => [row.id, row.version])).toEqual([[first.id, 1]]);
  expect((await listAnalysisHistory(project.id, { page: 3, limit: 1 })).data.items).toEqual([]);
  expect(await listAnalysisHistory(project.id, { page: 2, limit: 1 })).toEqual(older);
  app = createApp({ db: storage.db, llm, providers: [] });
  expect(await listAnalysisHistory(project.id, { page: 2, limit: 1 })).toEqual(older);
  const detail = await getAnalysis(older.data.items[0].id);
  expect(detail.data.version).toBe(1);
  expect(detail.data.projectSnapshot).toEqual(first.projectSnapshot);
}, 30000);
