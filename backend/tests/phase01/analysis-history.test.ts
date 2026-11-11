import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { authenticatedRequest as request, createAuthenticatedApp as createApp } from './auth.fixtures.js';
import { FixtureLLM, isolatedDatabase, projectInput, analysisFixture } from './fixtures.js';
import * as t from '../../src/phase01/db/schema.js';

let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
let app: ReturnType<typeof createApp>;
let projectId: string, emptyProjectId: string, originalId: string, assumptionId: string;
let reviewed: unknown, oldSnapshot: unknown;
const llm = new FixtureLLM();
beforeAll(async () => {
  storage = await isolatedDatabase();
  app = createApp({ db: storage.db, llm, providers: [], apiRateLimit: 1000, aiRateLimit: 100 });
  projectId = (await request(app).post('/api/projects').send(projectInput)).body.data.id;
  emptyProjectId = (await request(app).post('/api/projects').send(projectInput)).body.data.id;
  // Keep a legacy snapshot alongside modern versions; identical timestamps
  // deliberately prove that ordering uses persisted version, not time.
  const [legacy] = await storage.db.insert(t.analyses).values({
    projectId, version: 1, model: 'legacy-test', projectSnapshot: projectInput, result: analysisFixture,
  }).returning();
  originalId = legacy.id;
  oldSnapshot = legacy.projectSnapshot;
  const [assumption] = await storage.db.insert(t.assumptions).values({
    analysisId: originalId, ...analysisFixture.assumptions[0], riskScore: 20, riskLevel: 'CRITICAL', status: 'TESTING',
  }).returning();
  assumptionId = assumption.id;
  const interview = (await request(app).post(`/api/projects/${projectId}/interviews`).send({ participant: 'Test fixture' })).body.data;
  await request(app).post(`/api/interviews/${interview.id}/feedback`).send({
    notes: 'I used a spreadsheet yesterday to track interviews.', assumptionIds: [assumptionId],
  });
  const evidence = (await request(app).post(`/api/projects/${projectId}/feedback/analyze`).send({})).body.data.evidenceRecords
    .find((row: { sentiment: string }) => row.sentiment === 'SUPPORTING');
  expect((await request(app).patch(`/api/assumptions/${assumptionId}`).send({
    status: 'SUPPORTED', evidenceIds: [evidence.id],
  })).status).toBe(200);
  reviewed = await storage.db.select().from(t.assumptionEvidence);
  // A gap is intentional: clients must not label these by list position.
  await storage.db.insert(t.analyses).values(Array.from({ length: 32 }, (_, i) => ({
    projectId, version: i + 3, model: 'history-test', createdAt: legacy.createdAt,
    projectSnapshot: { ...projectInput, name: `Test snapshot ${i + 3}` }, result: analysisFixture,
  })));
}, 30000);
afterAll(async () => { await storage.client.close(); });

describe('Project analysis history', () => {
  it('paginates every stored version newest-first without inventing missing versions or truncating at 30', async () => {
    const ids: string[] = [], versions: number[] = [];
    for (let page = 1; page <= 5; page++) {
      const res = await request(app).get(`/api/projects/${projectId}/analyses?page=${page}&limit=10`);
      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toEqual({ page, limit: 10 });
      for (const row of res.body.data.items) {
        expect(Object.keys(row).sort()).toEqual(['createdAt', 'id', 'model', 'projectId', 'version']);
        expect(row.projectId).toBe(projectId);
        ids.push(row.id); versions.push(row.version);
      }
    }
    expect(new Set(ids).size).toBe(33);
    expect(versions).toEqual([...Array.from({ length: 32 }, (_, i) => 34 - i), 1]);
    expect(ids.at(-1)).toBe(originalId);
  });
  it('returns the same history on reload and with a fresh session/app, without any browser state', async () => {
    const path = `/api/projects/${projectId}/analyses?page=4&limit=10`;
    const initial = await request(app).get(path);
    expect((await request(app).get(path)).body).toEqual(initial.body);
    const fresh = createApp({ db: storage.db, llm, providers: [] });
    expect((await request(fresh).get(path)).body).toEqual(initial.body);
    const sessions = await request(fresh).get(`/api/projects/${projectId}/interviews`);
    expect(sessions.body.data.items).toHaveLength(1);
    expect(sessions.body.data.items[0].sourceAnalysisVersion).toBe(1);
    const old = await request(fresh).get(`/api/analyses/${originalId}`);
    expect(old.status).toBe(200);
    expect(old.body.data.version).toBe(1);
    expect(old.body.data.projectSnapshot).toEqual(oldSnapshot);
    expect(old.body.data.assumptions[0].status).toBe('SUPPORTED');
    const assumptions = await request(fresh).get(`/api/analyses/${originalId}/assumptions`);
    expect(assumptions.body.data.items[0].evidenceRecords.length).toBeGreaterThan(0);
    expect(await storage.db.select().from(t.assumptionEvidence)).toEqual(reviewed);
  });
  it('keeps snapshots, evidence and review states intact when a new analysis is created', async () => {
    await request(app).patch(`/api/projects/${projectId}`).send({ name: 'Updated brief' });
    const next = await request(app).post(`/api/projects/${projectId}/analyze`).send({});
    expect(next.status).toBe(201);
    expect(next.body.data.version).toBe(35);
    expect(next.body.data.projectSnapshot.name).toBe('Updated brief');
    expect(next.body.data.assumptions.every((a: { status: string }) => a.status === 'UNTESTED')).toBe(true);
    const history = await request(app).get(`/api/projects/${projectId}/analyses?limit=1`);
    expect(history.body.data.items[0].id).toBe(next.body.data.id);
    const old = await request(app).get(`/api/analyses/${originalId}`);
    expect(old.body.data.projectSnapshot).toEqual(oldSnapshot);
    expect(old.body.data.assumptions[0].status).toBe('SUPPORTED');
    expect(await storage.db.select().from(t.assumptionEvidence)).toEqual(reviewed);
    expect((await storage.db.select().from(t.assumptions).where(eq(t.assumptions.id, assumptionId)))[0].status).toBe('SUPPORTED');
  });
  it('returns an empty list for an owned project without analyses and validates pagination', async () => {
    const empty = await request(app).get(`/api/projects/${emptyProjectId}/analyses`);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toEqual({ items: [], pagination: { page: 1, limit: 20 } });
    for (const query of ['page=0', 'page=1.5', 'page=10001', 'limit=0', 'limit=101', 'limit=no', 'unknown=1']) {
      expect((await request(app).get(`/api/projects/${projectId}/analyses?${query}`)).status).toBe(400);
    }
  });
});
