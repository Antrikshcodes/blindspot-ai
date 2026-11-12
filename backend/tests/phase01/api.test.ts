import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { authenticatedRequest as request, createAuthenticatedApp as createApp } from './auth.fixtures.js';
import { eq } from 'drizzle-orm';
import { DisabledLLM } from '../../src/phase01/ai/provider.js';
import type { Provider } from '../../src/phase01/resource-intelligence/types.js';
import { ApiError } from '../../src/phase01/config.js';
import { assumptions, analyses, projects, experiments, resources, interviews } from '../../src/phase01/db/schema.js';
import { isolatedDatabase, FixtureLLM, projectInput, resourceFixture } from './fixtures.js';

let storage: Awaited<ReturnType<typeof isolatedDatabase>>;
let app: ReturnType<typeof createApp>;
let projectId: string; let analysisId: string; let assumptionId: string; let interviewId: string;
let resourceId: string; let evidenceId: string; let experimentId: string; let feedbackId: string;
const llm = new FixtureLLM();
const provider: Provider = {
  name: 'github', enabled: true, categories: ['GITHUB_REPOSITORY'],
  search: vi.fn(async () => [resourceFixture()]),
};
beforeAll(async () => {
  storage = await isolatedDatabase();
  app = createApp({ db: storage.db, llm, providers: [provider], apiRateLimit: 1000, aiRateLimit: 100 });
}, 30000);
afterAll(async () => { await storage.client.close(); });

describe('Project and validation API with isolated PostgreSQL', () => {
  it('reports database-backed health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.database).toBe('connected');
  });
  it('filters, sorts, archives and restores projects without deleting their data', async () => {
    const created = await request(app).post('/api/projects').send(projectInput);
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const edited = await request(app).patch(`/api/projects/${id}`).send({
      industry: 'Education', category: 'Marketplace', technicalRequirements: ['React', 'PostgreSQL'],
    });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ industry: 'Education', category: 'Marketplace',
      technicalRequirements: ['React', 'PostgreSQL'], status: 'ACTIVE' });

    const filtered = await request(app).get('/api/projects?industry=education&category=marketplace&search=students&sort=name&order=asc');
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.items.map((project: any) => project.id)).toContain(id);
    expect((await request(app).get('/api/projects?industry=finance')).body.data.items.map((p: any) => p.id)).not.toContain(id);

    const archived = await request(app).post(`/api/projects/${id}/archive`).send({});
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe('ARCHIVED');
    expect((await request(app).get('/api/projects')).body.data.items.map((p: any) => p.id)).not.toContain(id);
    expect((await request(app).get('/api/projects?status=ARCHIVED')).body.data.items.map((p: any) => p.id)).toContain(id);
    expect((await request(app).get(`/api/projects/${id}`)).status).toBe(200);

    const restored = await request(app).post(`/api/projects/${id}/restore`).send({});
    expect(restored.status).toBe(200);
    expect(restored.body.data.status).toBe('ACTIVE');
    expect((await request(app).get('/api/projects?status=ALL')).body.data.items.map((p: any) => p.id)).toContain(id);
    await request(app).delete(`/api/projects/${id}`);
    expect((await request(app).get('/api/projects?status=invalid')).status).toBe(400);
  });
  it('rejects missing fields, extra fields, malformed JSON and oversized payloads', async () => {
    expect((await request(app).post('/api/projects').send({})).status).toBe(400);
    expect((await request(app).post('/api/projects').send({ ...projectInput, id: 'spoof' })).status).toBe(400);
    expect((await request(app).post('/api/projects').set('Content-Type', 'application/json').send('{ nope }')).status).toBe(400);
    expect((await request(app).post('/api/projects').send({ name: 'x'.repeat(140000) })).status).toBe(413);
  });
  it('creates, retrieves, paginates and edits projects', async () => {
    const created = await request(app).post('/api/projects').send(projectInput);
    expect(created.status).toBe(201); projectId = created.body.data.id;
    expect((await request(app).get(`/api/projects/${projectId}`)).body.data.name).toBe(projectInput.name);
    expect((await request(app).get('/api/projects?limit=1&page=1')).body.data.items).toHaveLength(1);
    expect((await request(app).get('/api/projects?limit=101')).status).toBe(400);
    expect((await request(app).get('/api/projects/not-uuid')).status).toBe(400);
    expect((await request(app).patch(`/api/projects/${projectId}`).send({ name: 'Edited fixture' })).status).toBe(200);
    expect((await request(app).patch(`/api/projects/${projectId}`).send({})).status).toBe(400);
  });
  it('creates a versioned analysis and server-scored untested assumptions', async () => {
    const response = await request(app).post(`/api/projects/${projectId}/analyze`).send({});
    expect(response.status).toBe(201); analysisId = response.body.data.id;
    assumptionId = response.body.data.assumptions[0].id;
    expect(response.body.data.assumptions).toHaveLength(3);
    expect(response.body.data.assumptions[0]).toMatchObject({ status: 'UNTESTED', riskScore: 20, riskLevel: 'CRITICAL' });
    expect((await request(app).get(`/api/projects/${projectId}/analysis`)).body.data.id).toBe(analysisId);
    expect((await request(app).get(`/api/analyses/${analysisId}`)).status).toBe(200);
    expect((await request(app).get(`/api/analyses/${analysisId}/assumptions`)).body.data.items).toHaveLength(3);
  });
  it('rejects AI outages without fake findings or a saved analysis', async () => {
    const disabled = createApp({ db: storage.db, llm: new DisabledLLM(), providers: [] });
    const before = await storage.db.select().from(analyses);
    const response = await request(disabled).post(`/api/projects/${projectId}/analyze`).send({});
    expect(response.status).toBe(503);
    expect(await storage.db.select().from(analyses)).toHaveLength(before.length);
  });
  it('rejects direct support claims and requires testing plus appropriate evidence', async () => {
    const path = `/api/assumptions/${assumptionId}`;
    expect((await request(app).patch(path).send({ status: 'SUPPORTED' })).status).toBe(409);
    expect((await request(app).patch(path).send({ status: 'TESTING' })).status).toBe(200);
    expect((await request(app).patch(path).send({ status: 'SUPPORTED' })).body.error.code).toBe('EVIDENCE_REQUIRED');
    expect((await request(app).patch(path).send({ status: 'VERIFIED' })).status).toBe(400);
  });
  it('generates mapped interview questions and preserves real raw feedback', async () => {
    const callsBefore = llm.calls.length;
    const interview = await request(app).post(`/api/projects/${projectId}/interviews`).send({ participant: 'Participant alias' });
    expect(interview.status).toBe(201); interviewId = interview.body.data.id;
    expect(interview.body.data.questions).toHaveLength(8);
    expect(llm.calls).toHaveLength(callsBefore);
    expect(interview.body.data.questions[0].assumptionId).toBe(assumptionId);
    expect(interview.body.data.sourceAnalysisVersion).toBe(1);
    const legacySession = (await storage.db.insert(interviews).values({
      projectId,
      participant: 'Older session without version metadata',
      questions: interview.body.data.questions,
    }).returning())[0];
    const sessions = (await request(app).get(`/api/projects/${projectId}/interviews`)).body.data.items;
    expect(sessions).toHaveLength(2);
    expect(sessions.find((row: { id: string }) => row.id === interviewId).sourceAnalysisVersion).toBe(1);
    expect(sessions.find((row: { id: string }) => row.id === legacySession.id).sourceAnalysisVersion).toBeNull();
    expect((await request(app).post(`/api/interviews/${interviewId}/feedback`).send({ notes: 'short' })).status).toBe(400);
    const feedback = await request(app).post(`/api/interviews/${interviewId}/feedback`).send({
      notes: 'Last week I interviewed three people and tracked their examples in a spreadsheet.',
      assumptionIds: [assumptionId],
    });
    expect(feedback.status).toBe(201); feedbackId = feedback.body.data.id;
    const persisted = await request(app).get(`/api/interviews/${interviewId}/feedback?limit=1&page=1`);
    expect(persisted.status).toBe(200);
    expect(persisted.body.data.items[0]).toEqual(feedback.body.data);
    expect(persisted.body.data.items[0].notes).toBe('Last week I interviewed three people and tracked their examples in a spreadsheet.');
    expect((await request(app).get(`/api/interviews/${interviewId}/feedback?limit=1&page=2`)).body.data.items).toEqual([]);
    expect((await request(app).get('/api/interviews/not-a-uuid/feedback')).status).toBe(400);
    expect((await request(app).get('/api/interviews/00000000-0000-4000-8000-000000000000/feedback')).status).toBe(404);
    expect((await request(app).get(`/api/interviews/${interviewId}/feedback?limit=101`)).status).toBe(400);
    const summary = await request(app).post(`/api/projects/${projectId}/feedback/analyze`).send({});
    expect(summary.status).toBe(201); expect(summary.body.data.reviewRequired).toBe(true);
    evidenceId = summary.body.data.evidenceRecords.find((row: any) => row.sentiment === 'SUPPORTING').id;
    const [unchanged] = await storage.db.select().from(assumptions).where(eq(assumptions.id, assumptionId));
    expect(unchanged.status).toBe('TESTING');
    expect((await request(app).get(`/api/projects/${projectId}/feedback/summary`)).body.data.result.evidence).toHaveLength(1);
  });
  it('stores question-mapped responses, source links and a complete interview lifecycle', async () => {
    const initial = await request(app).get(`/api/interviews/${interviewId}`);
    expect(initial.status).toBe(200);
    expect(initial.body.data).toMatchObject({ status: 'IN_PROGRESS', participant: 'Participant alias' });
    expect(initial.body.data.answerProgress).toEqual({ answered: 0, total: 8, unanswered: 8 });
    expect((await request(app).patch(`/api/interviews/${interviewId}`).send({
      participantContext: 'Student founder; remote call',
    })).body.data.participantContext).toBe('Student founder; remote call');

    const firstQuestion = initial.body.data.questions[0];
    const responsePath = `/api/interviews/${interviewId}/responses/0`;
    expect((await request(app).put(responsePath).send({ assumptionId: projectId, answer: 'A mismatched assumption.' })).status).toBe(400);
    expect((await request(app).put(responsePath).send({ assumptionId: firstQuestion.assumptionId,
      answer: 'I used a spreadsheet yesterday.', sourceFeedbackId: projectId })).status).toBe(404);
    const first = await request(app).put(responsePath).send({ assumptionId: firstQuestion.assumptionId,
      answer: 'I used a spreadsheet yesterday.', sourceFeedbackId: feedbackId });
    expect(first.status).toBe(200);
    expect((await request(app).patch(`/api/interviews/${interviewId}`).send({ status: 'COMPLETED' })).body.error.code)
      .toBe('QUESTIONS_UNANSWERED');

    for (const question of initial.body.data.questions.slice(1)) {
      const saved = await request(app).put(`/api/interviews/${interviewId}/responses/${question.index}`).send({
        assumptionId: question.assumptionId, answer: `Answer for question ${question.index}.`,
      });
      expect(saved.status).toBe(200);
    }
    const detail = await request(app).get(`/api/interviews/${interviewId}`);
    expect(detail.body.data.answerProgress).toEqual({ answered: 8, total: 8, unanswered: 0 });
    expect(detail.body.data.questions.every((question: { answered: boolean }) => question.answered)).toBe(true);
    expect(detail.body.data.questions[0].response.sourceFeedbackId).toBe(feedbackId);

    const completed = await request(app).patch(`/api/interviews/${interviewId}`).send({ status: 'COMPLETED' });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('COMPLETED');
    expect(completed.body.data.completedAt).toBeTruthy();
    expect((await request(app).put(responsePath).send({ assumptionId: firstQuestion.assumptionId, answer: 'Late edit.' })).status).toBe(409);
  });
  it('rejects fabricated quotes without saving a summary', async () => {
    const invalidLLM = {
      generate: async () => ({ themes: [], evidence: [{
        feedbackId: '00000000-0000-4000-8000-000000000000', assumptionId,
        quote: 'This quote never happened.', sentiment: 'SUPPORTING', reasoning: 'Invented.',
      }], contradictions: [], evidenceGaps: [], unsupportedConclusions: [] }),
    };
    const invalidApp = createApp({ db: storage.db, llm: invalidLLM as any, providers: [] });
    const response = await request(invalidApp).post(`/api/projects/${projectId}/feedback/analyze`).send({});
    expect(response.status).toBe(502); expect(response.body.error.code).toBe('AI_EVIDENCE_INVALID');
  });
  it('reviews evidence explicitly, blocks mismatched evidence, then records support', async () => {
    const path = `/api/assumptions/${assumptionId}`;
    expect((await request(app).patch(path).send({ status: 'INVALIDATED', evidenceIds: [evidenceId] })).status).toBe(400);
    expect((await request(app).patch(path).send({ status: 'SUPPORTED', evidenceIds: [evidenceId] })).body.data.status).toBe('SUPPORTED');
    expect((await request(app).patch(path).send({ status: 'TESTING' })).status).toBe(200);
    expect((await request(app).patch(path).send({ status: 'INCONCLUSIVE', evidenceIds: [evidenceId] })).body.data.status).toBe('INCONCLUSIVE');
  });
  it('creates measurable experiments, enforces transitions and never auto-validates', async () => {
    const created = await request(app).post(`/api/projects/${projectId}/experiments`).send({ assumptionId });
    expect(created.status).toBe(201); experimentId = created.body.data.id;
    expect(created.body.data.successCriteria).toBeTruthy();
    const path = `/api/experiments/${experimentId}`;
    expect((await request(app).patch(path).send({ status: 'COMPLETED', observedResult: 'One example.' })).status).toBe(409);
    expect((await request(app).patch(path).send({ status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await request(app).patch(path).send({ status: 'COMPLETED' })).status).toBe(400);
    expect((await request(app).patch(path).send({ status: 'COMPLETED', observedResult: 'One concrete example collected.' })).status).toBe(200);
    expect((await request(app).get(`/api/projects/${projectId}/experiments`)).body.data.items).toHaveLength(1);
    const [row] = await storage.db.select().from(assumptions).where(eq(assumptions.id, assumptionId));
    expect(row.status).toBe('INCONCLUSIVE');
  });
});
describe('Resource intelligence API', () => {
  it('retrieves, normalizes, ranks and explains only actual candidate records', async () => {
    const response = await request(app).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation interview', categories: ['GITHUB_REPOSITORY'],
    });
    expect(response.status).toBe(201); resourceId = response.body.data.items[0].resource.id;
    expect(response.body.data.explanationStatus).toBe('GENERATED');
    expect(response.body.data.items[0].resource.license).toBeNull();
    expect(response.body.data.items[0].explanation.resourceId).toBe(resourceId);
    expect(response.body.data.items[0].ranking.licenseCompatibility).toBe('UNKNOWN');
    expect((await request(app).get(`/api/resources/${resourceId}`)).body.data.url).toBe('https://github.com/example/fixture');
  });
  it('caches retrieval, deduplicates across searches and extracts queries from the project', async () => {
    const calls = vi.mocked(provider.search).mock.calls.length;
    const repeat = await request(app).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation interview', categories: ['GITHUB_REPOSITORY'], explain: false,
    });
    expect(repeat.body.data.cached).toBe(true);
    expect(vi.mocked(provider.search).mock.calls).toHaveLength(calls);
    const auto = await request(app).post(`/api/projects/${projectId}/resources/search`).send({
      categories: ['GITHUB_REPOSITORY'], explain: false,
    });
    expect(auto.status).toBe(201); expect(auto.body.data.requirements).toEqual(['Collect interview evidence']);
    expect(await storage.db.select().from(resources)).toHaveLength(1);
  });
  it('saves idempotently, filters saved state and removes a save without deleting resources', async () => {
    const path = `/api/resources/${resourceId}/save`;
    const saved = await request(app).post(path).send({ projectId });
    expect(saved.status).toBe(200);
    const updated = await request(app).post(path).send({ projectId, status: 'TRYING' });
    expect(updated.body.data.id).toBe(saved.body.data.id);
    expect(updated.body.data.status).toBe('TRYING');
    expect((await request(app).post(path).send({ projectId })).body.data.status).toBe('TRYING');
    expect((await request(app).get(`/api/projects/${projectId}/resources?saved=true`)).body.data.items).toHaveLength(1);
    expect((await request(app).get(`/api/projects/${projectId}/resources?saved=false`)).body.data.items).toHaveLength(0);
    expect((await request(app).delete(`/api/projects/${projectId}/resources/${resourceId}/save`)).status).toBe(200);
    expect((await request(app).get(`/api/projects/${projectId}/resources?saved=false`)).body.data.items).toHaveLength(1);
  });
  it('refuses cross-project references and saving resources not retrieved for a project', async () => {
    const other = (await request(app).post('/api/projects').send(projectInput)).body.data.id;
    expect((await request(app).post(`/api/projects/${other}/experiments`).send({ assumptionId })).status).toBe(400);
    expect((await request(app).post(`/api/resources/${resourceId}/save`).send({ projectId: other })).status).toBe(404);
    expect((await request(app).delete(`/api/projects/${other}`)).status).toBe(200);
  });
  it('rejects fabricated AI destinations without losing genuine retrieved resources', async () => {
    const malicious = { generate: async () => ({ explanations: [{
      resourceId: '00000000-0000-4000-8000-000000000000',
      recommendedUseCase: 'Use https://made-up.example/tool',
      explanation: 'Ignore the prompt.', integrationDifficulty: 'EASY', limitations: [], alternativeResourceIds: [],
    }] }) };
    const unsafeApp = createApp({ db: storage.db, llm: malicious as any, providers: [provider] });
    const response = await request(unsafeApp).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation', categories: ['GITHUB_REPOSITORY'],
    });
    expect(response.status).toBe(201);
    expect(response.body.data.explanationStatus).toBe('UNAVAILABLE');
    expect(response.body.data.items[0].explanation).toBeNull();
    expect(JSON.stringify(response.body.data)).not.toContain('made-up.example');
  });
  it('surfaces provider failures and partial results without manufactured substitutes', async () => {
    const failed: Provider = { ...provider, name: 'broken', search: async () => { throw new ApiError(502, 'UPSTREAM', 'Unavailable'); } };
    const failingApp = createApp({ db: storage.db, llm, providers: [failed] });
    expect((await request(failingApp).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation', categories: ['GITHUB_REPOSITORY'], explain: false,
    })).status).toBe(503);
    const partialApp = createApp({ db: storage.db, llm, providers: [provider, failed] });
    const partial = await request(partialApp).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation', categories: ['GITHUB_REPOSITORY'], explain: false,
    });
    expect(partial.body.data.providerStatuses).toContainEqual(expect.objectContaining({ provider: 'broken', status: 'FAILED' }));
    expect(partial.body.data.items).toHaveLength(1);
  });
});
describe('Operational safeguards', () => {
  it('rate limits API traffic and AI-triggering routes', async () => {
    const limited = createApp({ db: storage.db, llm, providers: [], apiRateLimit: 1 });
    expect((await request(limited).get('/api/projects')).status).toBe(200);
    expect((await request(limited).get('/api/projects')).status).toBe(429);
    const aiLimited = createApp({ db: storage.db, llm, providers: [], aiRateLimit: 1 });
    expect((await request(aiLimited).post(`/api/projects/${projectId}/resources/search`).send({ query: 'validation', explain: false })).status).toBe(503);
    expect((await request(aiLimited).post(`/api/projects/${projectId}/resources/search`).send({ query: 'validation', explain: false })).status).toBe(429);
  });
  it('uses verified identity despite a spoofed user header', async () => {
    const authenticated = createApp({ db: storage.db, llm, providers: [] });
    expect((await request(authenticated).get('/api/health')).status).toBe(200);
    const response = await request(authenticated).get('/api/projects').set('X-User-Id', projectId);
    expect(response.status).toBe(200);
    expect(response.body.data.items.map((row: any) => row.id)).toEqual([projectId]);
  });
  it('stores long original feedback with mappings without exceeding PostgreSQL index limits', async () => {
    const response = await request(app).post(`/api/interviews/${interviewId}/feedback`).send({
      notes: 'Long verbatim participant notes. '.repeat(300), assumptionIds: [assumptionId],
    });
    expect(response.status).toBe(201);
    expect(response.body.data.notes.length).toBeGreaterThan(8000);
  });
  it('deletes project data through foreign-key cascades, not global resources', async () => {
    expect((await request(app).delete(`/api/projects/${projectId}`)).status).toBe(200);
    expect((await request(app).get(`/api/projects/${projectId}`)).status).toBe(404);
    expect(await storage.db.select().from(projects)).toHaveLength(0);
    expect(await storage.db.select().from(analyses)).toHaveLength(0);
    expect(await storage.db.select().from(experiments)).toHaveLength(0);
    expect(await storage.db.select().from(resources)).toHaveLength(1);
  });
});
