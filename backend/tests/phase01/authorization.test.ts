import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createApp } from '../../src/phase01/app.js';
import * as t from '../../src/phase01/db/schema.js';
import { FixtureLLM, isolatedDatabase, projectInput, resourceFixture } from './fixtures.js';
import { sessionToken, testAuth, testOrigin, testOwner } from './auth.fixtures.js';

type Method = 'get' | 'post' | 'patch' | 'delete';
type Operation = [Method, string, Record<string, unknown>?];
let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
let app: ReturnType<typeof createApp>;
let projectId: string, analysisId: string, assumptionId: string, interviewId: string, experimentId: string;
let resourceId: string, evidenceId: string, otherProjectId: string, orphanId: string;
const otherOwner = 'user_founder_b';
const llm = new FixtureLLM();
const providerSearch = vi.fn(async () => [resourceFixture()]);
const call = (method: Method, path: string, body?: Record<string, unknown>, subject = testOwner) => {
  const test = request(app)[method](path).set('Authorization', `Bearer ${sessionToken(subject)}`);
  return body ? test.send(body) : test;
};
const experimentInput = () => ({
  assumptionId, name: 'Interview experiment', explanation: 'Collect evidence.',
  method: 'Interview three founders.', evidenceToCollect: 'Recent concrete examples.',
  successCriteria: 'Three concrete examples.',
});

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  storage = await isolatedDatabase();
  app = createApp({
    db: storage.db, llm,
    providers: [{ name: 'github', enabled: true, categories: ['GITHUB_REPOSITORY'], search: providerSearch }],
    auth: testAuth, apiRateLimit: 1000, aiRateLimit: 100,
  });
  const created = await call('post', '/api/projects', projectInput);
  expect(created.status).toBe(201);
  expect(created.body.data.ownerId).toBe(testOwner);
  projectId = created.body.data.id;
  const analyzed = await call('post', `/api/projects/${projectId}/analyze`, {});
  expect(analyzed.status).toBe(201);
  analysisId = analyzed.body.data.id; assumptionId = analyzed.body.data.assumptions[0].id;
  const interview = await call('post', `/api/projects/${projectId}/interviews`, { participant: 'Private participant' });
  expect(interview.status).toBe(201);
  interviewId = interview.body.data.id;
  expect((await call('post', `/api/interviews/${interviewId}/feedback`,
    { notes: 'Private note about a recent manual validation attempt.', assumptionIds: [assumptionId] })).status).toBe(201);
  const feedback = await call('post', `/api/projects/${projectId}/feedback/analyze`, {});
  expect(feedback.status).toBe(201);
  evidenceId = feedback.body.data.evidenceRecords.find((row: any) => row.sentiment === 'SUPPORTING').id;
  const experiment = await call('post', `/api/projects/${projectId}/experiments`, experimentInput());
  expect(experiment.status).toBe(201);
  experimentId = experiment.body.data.id;
  const search = await call('post', `/api/projects/${projectId}/resources/search`, { query: 'validation interview', explain: false });
  expect(search.status).toBe(201);
  resourceId = search.body.data.items[0].resourceId;
  expect((await call('post', `/api/resources/${resourceId}/save`, { projectId })).status).toBe(200);
  otherProjectId = (await call('post', '/api/projects', { ...projectInput, name: 'Other founder private project' }, otherOwner)).body.data.id;
  [orphanId] = (await storage.db.insert(t.projects).values(projectInput).returning()).map(row => row.id);
}, 30000);
afterAll(async () => { await storage.client.close(); vi.unstubAllEnvs(); });

function projectOperations(id: string): Operation[] {
  return [
    ['get', `/api/projects/${id}`],
    ['patch', `/api/projects/${id}`, { name: 'Must not change' }],
    ['delete', `/api/projects/${id}`],
    ['post', `/api/projects/${id}/analyze`, {}],
    ['get', `/api/projects/${id}/analysis`],
    ['get', `/api/projects/${id}/analyses`],
    ['post', `/api/projects/${id}/interviews`, { participant: 'Attacker' }],
    ['get', `/api/projects/${id}/interviews`],
    ['post', `/api/projects/${id}/feedback/analyze`, {}],
    ['get', `/api/projects/${id}/feedback/summary`],
    ['post', `/api/projects/${id}/experiments`, experimentInput()],
    ['get', `/api/projects/${id}/experiments`],
    ['post', `/api/projects/${id}/resources/search`, { query: 'private query', explain: false }],
    ['get', `/api/projects/${id}/resources`],
    ['get', `/api/projects/${id}/resources/searches`],
    ['get', `/api/projects/${id}/resources/saved`],
    ['post', `/api/resources/${resourceId}/save`, { projectId: id, status: 'INTEGRATED' }],
    ['delete', `/api/projects/${id}/resources/${resourceId}/save`],
    ['delete', `/api/resources/${resourceId}/save`, { projectId: id }],
  ];
}
function childOperations(): Operation[] {
  return [
    ['get', `/api/analyses/${analysisId}`],
    ['get', `/api/analyses/${analysisId}/blindspots`],
    ['get', `/api/analyses/${analysisId}/interview-questions`],
    ['get', `/api/analyses/${analysisId}/summary`],
    ['get', `/api/analyses/${analysisId}/assumptions`],
    ['patch', `/api/assumptions/${assumptionId}`, { status: 'TESTING' }],
    ['post', `/api/interviews/${interviewId}/feedback`, { notes: 'Unauthorized note.', assumptionIds: [] }],
    ['get', `/api/interviews/${interviewId}/feedback`],
    ['patch', `/api/experiments/${experimentId}`, { status: 'IN_PROGRESS' }],
    ['get', `/api/resources/${resourceId}`],
  ];
}
describe('Verified identity and owner isolation (production path)', () => {
  it('rejects unsigned, forged, expired, future and wrong-origin identities', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
    for (const token of [
      'not-a-token',
      `${sessionToken()}.tampered`,
      `${sessionToken().slice(0, -8)}AAAAAAAA`,
      sessionToken(testOwner, { exp: 1 }),
      sessionToken(testOwner, { nbf: Math.floor(Date.now() / 1000) + 3600 }),
      sessionToken(testOwner, { azp: 'https://attacker.example' }),
    ]) {
      expect((await request(app).get('/api/projects').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    }
    const unsigned = [
      Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: testOwner })).toString('base64url'), '',
    ].join('.');
    expect((await request(app).get('/api/projects').set('Authorization', `Bearer ${unsigned}`)).status).toBe(401);
    for (const operation of [['get', '/api/projects'], ['post', '/api/projects'], ...projectOperations(projectId), ...childOperations()] as Operation[]) {
      const [method, path, body] = operation;
      const response = await request(app)[method](path).set('X-User-Id', testOwner).send(body);
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });
  it('keeps missing provider configuration fail-closed, even in development', async () => {
    for (const environment of ['development', 'production']) {
      vi.stubEnv('NODE_ENV', environment);
      const closed = createApp({ db: storage.db, llm, providers: [],
        auth: { publishableKey: '', secretKey: '' } });
      expect((await request(closed).get('/api/health')).status).toBe(200);
      const response = await request(closed).get('/api/projects').set('X-User-Id', testOwner);
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('AUTH_NOT_READY');
      expect((await request(closed).get(`/api/projects/${projectId}/analyses`)).status).toBe(503);
    }
  });
  it('derives ownership only from the verified subject and filters lists before pagination', async () => {
    const response = await request(app).get('/api/projects?page=1&limit=1')
      .set('Authorization', `Bearer ${sessionToken(otherOwner, { userId: testOwner })}`).set('X-User-Id', testOwner);
    expect(response.status).toBe(200);
    expect(response.body.data.items.map((row: any) => row.id)).toEqual([otherProjectId]);
    expect((await call('post', '/api/projects', { ...projectInput, ownerId: otherOwner })).status).toBe(400);
    expect((await call('post', '/api/projects', { ...projectInput, userId: otherOwner })).status).toBe(400);
    expect((await call('patch', `/api/projects/${projectId}`, { ownerId: otherOwner })).status).toBe(400);
    expect((await call('get', '/api/projects?userId=user_founder_a')).status).toBe(400);
  });
  it('rejects every foreign project and direct-child operation before AI/provider calls or writes', async () => {
    const callsBefore = llm.calls.length; const searchesBefore = providerSearch.mock.calls.length;
    const counts = async () => Promise.all([
      storage.db.select().from(t.feedback), storage.db.select().from(t.evidence),
      storage.db.select().from(t.analyses), storage.db.select().from(t.searches),
      storage.db.select().from(t.saves),
    ]);
    const before = await counts();
    for (const [method, path, body] of [...projectOperations(projectId), ...childOperations()]) {
      const response = await call(method, path, body, otherOwner);
      expect(response.status, `${method} ${path}`).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(JSON.stringify(response.body)).not.toContain('Private note');
    }
    expect(llm.calls).toHaveLength(callsBefore);
    expect(providerSearch).toHaveBeenCalledTimes(searchesBefore);
    expect(await counts()).toEqual(before);
    expect((await storage.db.select().from(t.projects).where(eq(t.projects.id, projectId)))[0].name).toBe(projectInput.name);
    expect((await storage.db.select().from(t.experiments).where(eq(t.experiments.id, experimentId)))[0].status).toBe('PLANNED');
  });
  it('quarantines all pre-authentication ownerless data without deleting or claiming it', async () => {
    for (const subject of [testOwner, otherOwner]) {
      for (const [method, path, body] of projectOperations(orphanId)) {
        expect((await call(method, path, body, subject)).status, `${method} ${path}`).toBe(404);
      }
      const response = await call('get', '/api/projects', undefined, subject);
      expect(response.body.data.items.map((row: any) => row.id)).not.toContain(orphanId);
    }
    expect((await storage.db.select().from(t.projects).where(eq(t.projects.id, orphanId)))[0].ownerId).toBeNull();
  });
  it('rejects foreign assumption and evidence IDs even when the target belongs to the requester', async () => {
    expect((await call('post', `/api/projects/${otherProjectId}/experiments`, experimentInput(), otherOwner)).status).toBe(404);
    const otherAnalysis = await call('post', `/api/projects/${otherProjectId}/analyze`, {}, otherOwner);
    const otherAssumptionId = otherAnalysis.body.data.assumptions[0].id;
    const otherInterview = await call('post', `/api/projects/${otherProjectId}/interviews`, { participant: 'Other' }, otherOwner);
    expect((await call('post', `/api/interviews/${otherInterview.body.data.id}/feedback`, {
      notes: 'Must not link across owners.', assumptionIds: [assumptionId],
    }, otherOwner)).status).toBe(404);
    expect((await call('patch', `/api/assumptions/${otherAssumptionId}`, { status: 'TESTING' }, otherOwner)).status).toBe(200);
    expect((await call('patch', `/api/assumptions/${otherAssumptionId}`,
      { status: 'SUPPORTED', evidenceIds: [evidenceId] }, otherOwner)).status).toBe(400);
    expect((await call('post', `/api/resources/${resourceId}/save`, { projectId: otherProjectId }, otherOwner)).status).toBe(404);
  });
  it('permits owner reads, evidence review, edits, resource state changes and deletion', async () => {
    for (const [method, path] of [...projectOperations(projectId), ...childOperations()].filter(([method]) => method === 'get')) {
      expect((await call(method, path)).status, path).toBe(200);
    }
    expect((await call('patch', `/api/projects/${projectId}`, { name: 'Updated by owner' })).status).toBe(200);
    expect((await call('patch', `/api/assumptions/${assumptionId}`, { status: 'TESTING' })).status).toBe(200);
    expect((await call('patch', `/api/assumptions/${assumptionId}`, { status: 'SUPPORTED', evidenceIds: [evidenceId] })).status).toBe(200);
    expect((await call('patch', `/api/experiments/${experimentId}`, { status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await call('delete', `/api/projects/${projectId}/resources/${resourceId}/save`)).status).toBe(200);
    expect((await call('post', `/api/resources/${resourceId}/save`, { projectId, status: 'TRYING' })).status).toBe(200);
    expect((await call('delete', `/api/resources/${resourceId}/save`, { projectId })).status).toBe(200);
    expect((await call('delete', `/api/projects/${projectId}`)).status).toBe(200);
    expect((await call('get', `/api/analyses/${analysisId}`)).status).toBe(404);
    expect((await call('get', `/api/resources/${resourceId}`)).status).toBe(404);
    expect((await call('get', `/api/projects/${otherProjectId}`, undefined, otherOwner)).status).toBe(200);
    expect((await call('get', `/api/projects/${randomUUID()}`)).status).toBe(404);
  });
  it('accepts verified session cookies and rejects cross-site or originless writes', async () => {
    // Development Clerk cookies also carry client activity and the dev-browser
    // marker. They are not identity proof; __session must still verify.
    const cookie = `__session=${sessionToken()}; __client_uat=1; __clerk_db_jwt=offline-browser`;
    const read = await request(app).get('/api/projects').set('Cookie', cookie);
    expect(read.status).toBe(200);
    for (const authorization of ['Basic ignored', 'Bearer', 'Bearer not-a-jwt']) {
      expect((await request(app).post('/api/projects').set('Host', 'localhost')
        .set('Cookie', cookie).set('Authorization', authorization).send(projectInput)).status).toBe(401);
    }
    for (const origin of [undefined, 'https://attacker.example']) {
      let test = request(app).post('/api/projects').set('Host', 'localhost').set('Cookie', cookie);
      if (origin) test = test.set('Origin', origin);
      expect((await test.send(projectInput)).status).toBe(403);
    }
    expect((await request(app).post('/api/projects').set('Host', 'localhost').set('Cookie', cookie)
      .set('Origin', testOrigin).set('Sec-Fetch-Site', 'cross-site').send(projectInput)).status).toBe(403);
    const created = await request(app).post('/api/projects').set('Host', 'localhost')
      .set('Cookie', cookie).set('Origin', testOrigin).send(projectInput);
    expect(created.status).toBe(201);
    expect(created.body.data.ownerId).toBe(testOwner);
    await call('delete', `/api/projects/${created.body.data.id}`);
  });
});
