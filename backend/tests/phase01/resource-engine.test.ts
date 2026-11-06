import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../src/phase01/app.js';
import { ApiError } from '../../src/phase01/config.js';
import * as t from '../../src/phase01/db/schema.js';
import * as c from '../../src/phase01/contracts.js';
import { HttpClient } from '../../src/phase01/resource-intelligence/http.js';
import { GithubProvider, HuggingFaceProvider, KaggleProvider, UciProvider } from '../../src/phase01/resource-intelligence/providers.js';
import { ApisGuruProvider } from '../../src/phase01/resource-intelligence/apis-guru.provider.js';
import { deduplicate, normalizeResource, publicHttpsUrl } from '../../src/phase01/resource-intelligence/normalize.js';
import { rankResource } from '../../src/phase01/resource-intelligence/ranking.js';
import { ResourceQueryService } from '../../src/phase01/resource-intelligence/query.service.js';
import { ResourceExplanationService } from '../../src/phase01/resource-intelligence/explanation.service.js';
import { ResourceRetrievalService } from '../../src/phase01/resource-intelligence/retrieval.service.js';
import type { Provider } from '../../src/phase01/resource-intelligence/types.js';
import { FixtureLLM, isolatedDatabase, projectInput, resourceFixture } from './fixtures.js';

const http = (handler: (url: string, init?: RequestInit) => Promise<Response>) =>
  new HttpClient(handler as typeof fetch, { sleep: async () => {} });
const githubItem = { id: 1, full_name: 'example/fixture', html_url: 'https://github.com/example/fixture',
  description: 'Text classification', archived: false, created_at: '2020-01-01', open_issues_count: 3 };
describe('Phase 03 official providers and trust boundaries', () => {
  it('filters archived repos by default; supports pagination/topics/language and source metadata', async () => {
    const transport = vi.fn(async () => new Response(JSON.stringify({
      items: [githubItem, { ...githubItem, id: 2, archived: true }],
    })));
    const provider = new GithubProvider(http(transport));
    const rows = await provider.search('classification', ['Python'], { page: 2, limit: 3, topics: ['nlp'] });
    expect(rows).toHaveLength(1); expect(rows[0].sourceCreatedAt).toEqual(new Date('2020-01-01'));
    expect(rows[0].sourceMetadata.openIssues).toBe(3);
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.searchParams.get('q')).toContain('archived:false');
    expect(url.searchParams.get('q')).toContain('language:Python topic:nlp');
    expect(url.searchParams.get('page')).toBe('2');
    expect((await provider.search('classification', [], { includeArchived: true }))[1].sourceMetadata.warnings).toHaveLength(1);
  });
  it('retrieves public repository metadata and refuses path traversal identities', async () => {
    const provider = new GithubProvider(http(async () => new Response(JSON.stringify(githubItem))));
    expect((await provider.getRepository('example', 'fixture')).sourceApiUrl).toContain('/repos/example/fixture');
    await expect(provider.getRepository('..', 'fixture')).rejects.toMatchObject({ code: 'INVALID_REPOSITORY' });
  });
  it('rejects an incompatible HF pipeline even if the model name matches', async () => {
    const transport = vi.fn(async (url: string) => url.includes('/raw/') ? new Response('Retrieved model card')
      : new Response(JSON.stringify([
        { id: 'example/fake-news-image', pipeline_tag: 'image-classification' },
        { id: 'example/fake-news-text', pipeline_tag: 'text-classification', library_name: 'transformers',
          cardData: { license: 'apache-2.0' } },
      ])));
    const rows = await new HuggingFaceProvider(http(transport), 'models')
      .search('fake-news', [], { tasks: ['text-classification'] });
    expect(rows).toHaveLength(1); expect(rows[0].name).toContain('text');
    expect(rows[0].sourceMetadata.library).toBe('transformers');
    expect(rows[0].license).toBe('apache-2.0');
    expect(String(transport.mock.calls[0][0])).toContain('filter=text-classification');
  });
  it('does not contact Kaggle without credentials and disables rejected credentials', async () => {
    const transport = vi.fn(async () => new Response('unauthorized', { status: 401 }));
    const disabled = new KaggleProvider(http(transport), { enabled: true });
    expect(disabled.enabled).toBe(false);
    await expect(disabled.search('news')).rejects.toMatchObject({ code: 'PROVIDER_DISABLED' });
    expect(transport).not.toHaveBeenCalled();
    const authenticated = new KaggleProvider(http(transport), { enabled: true, username: 'fixture', key: 'fixture-only' });
    await expect(authenticated.search('news')).rejects.toMatchObject({ upstreamStatus: 401 });
    expect(authenticated.enabled).toBe(false);
    await expect(authenticated.search('news')).rejects.toMatchObject({ code: 'PROVIDER_DISABLED' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('retains authenticated Kaggle owner and available file metadata', async () => {
    const transport = vi.fn(async () => new Response(JSON.stringify([{
      ref: 'example/data', title: 'News', files: [{ name: 'news.csv', totalBytes: 100 }], licenseName: 'CC0',
    }])));
    const [row] = await new KaggleProvider(http(transport),
      { enabled: true, username: 'fixture', key: 'fixture-only' }).search('news');
    expect(row.sourceMetadata.owner).toBe('example');
    expect(row.sourceMetadata.files).toEqual([{ name: 'news.csv', totalBytes: 100 }]);
  });
  it('retains UCI subject/tasks/features and does not infer a universal license', async () => {
    const transport = async (url: string) => new Response(JSON.stringify(url.includes('/datasets/list')
      ? { data: [{ id: 53, name: 'Iris' }] } : { data: {
        name: 'Iris', repository_url: 'https://archive.ics.uci.edu/dataset/53/iris', area: 'Biology',
        tasks: ['Classification'], variables: [{ name: 'petal', type: 'Real', role: 'Feature' }],
      } }));
    const [row] = await new UciProvider(http(transport)).search('iris');
    expect(row.license).toBeNull(); expect(row.sourceMetadata.subject).toBe('Biology');
    expect(row.sourceMetadata.variables).toHaveLength(1);
  });
  it('searches the real directory format, caches it, and separates spec license from service terms', async () => {
    const transport = vi.fn(async () => new Response(JSON.stringify({
      'example.com:news': { preferred: 'v1', versions: { v1: {
        info: { title: 'Fact check news API', description: 'News credibility tools.',
          license: { name: 'CC-BY-3.0' }, 'x-providerName': 'example.com', 'x-apisguru-categories': ['media'] },
        externalDocs: { url: 'https://developers.google.com/fact-check/tools/api/' },
        swaggerUrl: 'https://api.apis.guru/v2/specs/news/v1/openapi.json',
      } } },
      'evil': { preferred: 'v1', versions: { v1: { info: { title: 'news' },
        swaggerUrl: 'https://127.0.0.1/private' } } },
    })));
    const provider = new ApisGuruProvider(http(transport));
    const [row] = await provider.search('news');
    expect(row.provider).toBe('apis_guru'); expect(row.sourceMetadata.pricing).toBe('UNKNOWN');
    expect(row.license).toBeNull(); expect(row.sourceMetadata.specificationLicense).toEqual({ name: 'CC-BY-3.0' });
    await provider.search('fact check'); expect(transport).toHaveBeenCalledTimes(1);
    expect(normalizeResource(row)).not.toBeNull();
  });
  it.each(['https://127.0.0.1/x', 'https://2130706433/x', 'https://[::1]/x',
    'https://host.local/x', 'https://secret.internal/x', 'http://api.example.com/x',
    'https://user:password@api.example.com/x', 'https://api.example.com:9000/x'])('rejects unsafe public links %s', url => {
    expect(publicHttpsUrl(url)).toBe(false);
    expect(normalizeResource(resourceFixture({ provider: 'apis_guru', category: 'API', url }))).toBeNull();
  });
  it('rejects forged source API URLs and marks missing descriptions explicitly unknown', () => {
    expect(normalizeResource(resourceFixture({ sourceApiUrl: 'https://evil.com/metadata' }))).toBeNull();
    const row = normalizeResource(resourceFixture({ description: '' }))!;
    expect(row.sourceApiUrl).toBeNull();
    expect((row.sourceMetadata.metadataAvailability as any).description).toBe('UNKNOWN');
  });
  it('deduplicates provider IDs across renamed URLs but preserves case-sensitive HF identities', () => {
    expect(deduplicate([resourceFixture(), resourceFixture({ url: 'https://github.com/example/renamed' })])).toHaveLength(1);
    expect(deduplicate(['A', 'a'].map(id => resourceFixture({ provider: 'huggingface',
      externalId: `models/example/${id}`, url: `https://huggingface.co/example/${id}` })))).toHaveLength(2);
  });
  it('bounds actual hanging transports with an abort/timeout, not only cooperative fetch', async () => {
    const client = new HttpClient((async () => new Promise(() => {})) as typeof fetch,
      { timeoutMs: 10, sleep: async () => {} });
    await expect(client.json('https://api.github.com/search/repositories?q=x'))
      .rejects.toMatchObject({ code: 'PROVIDER_TIMEOUT' });
  });
  it('respects a long Retry-After without immediately retrying the provider', async () => {
    const transport = vi.fn(async () => new Response('', { status: 429, headers: { 'retry-after': '60' } }));
    await expect(http(transport).json('https://api.github.com/search/repositories?q=x'))
      .rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMITED', retryAfterSeconds: 60 });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
describe('Queries, deterministic ranking and evidence-limited AI explanations', () => {
  it('generates and deduplicates provider-specific queries with Phase 02 context', async () => {
    let captured: any;
    const llm = { generate: async (_task: string, input: unknown, schema: any) => {
      captured = input; return schema.parse({ requirements: ['Text classification'], tasks: ['text-classification'],
        queries: [{ provider: 'github', query: 'fake news' }, { provider: 'github', query: 'fake-news' },
          { provider: 'huggingface_models', query: 'misinformation' }] });
    } };
    const providers = [{ name: 'github', enabled: true }, { name: 'huggingface_models', enabled: true }] as Provider[];
    const plan = await new ResourceQueryService(llm as any).generate({ ...projectInput } as any,
      { id: 'test', result: { decomposition: { technicalRequirements: [{ statement: 'Classify news' }] },
        assumptions: [{ description: 'Users need classification' }], blindspots: [{ title: 'Source bias' }] } } as any,
      c.searchInput.parse({}), providers);
    expect(plan.queries).toHaveLength(2);
    expect(captured.technicalRequirements).toEqual(['Classify news']);
    expect(captured.blindspots[0].title).toBe('Source bias');
  });
  it('recognizes concept synonyms and never uses popularity as quality', () => {
    const row = resourceFixture({ name: 'misinformation', description: 'Text classifier', tags: [],
      qualitySignals: { ...resourceFixture().qualitySignals, stars: 0 } });
    const first = rankResource(row, 'fake news');
    const popular = rankResource({ ...row, qualitySignals: { ...row.qualitySignals, stars: 100000000 } }, 'fake news');
    expect(first.relevanceScore).toBeGreaterThan(0);
    expect(first.rankScore).toBe(popular.rankScore);
    expect(first.qualityScore).toBe(popular.qualityScore);
    expect(first.ranking.maintenanceStatus).toBe('UNKNOWN');
    expect(first.ranking.documentationStatus).toBe('UNKNOWN');
  });
  it('does not confuse a substring such as artifact with a fact-checking match', () => {
    const row = resourceFixture({ name: 'artifact tools', description: 'Artifact storage checks.', tags: [] });
    expect(rankResource(row, 'fact').relevanceScore).toBe(0);
  });
  it('makes task incompatibility, license uncertainty and integration uncertainty explicit', () => {
    const row = resourceFixture({ category: 'AI_MODEL',
      qualitySignals: { ...resourceFixture().qualitySignals, task: 'image-classification' } });
    const value = rankResource(row, 'classification', [], undefined, Date.now(), ['text-classification']);
    expect(value.ranking.technicalCompatibility).toBe('INCOMPATIBLE');
    expect(value.ranking.licenseCompatibility).toBe('UNKNOWN');
    expect(value.ranking.integrationDifficulty).toBe('UNKNOWN');
  });
  it('rejects invented metadata citations even if candidate IDs are genuine', async () => {
    const llm = new FixtureLLM(); const original = llm.generate.bind(llm);
    llm.generate = async (task: string, input: unknown, schema: any) => {
      const data: any = await original(task, input, schema);
      data.explanations[0].metadataCitations[0].quote = 'Invented benchmark and integration';
      return data;
    };
    await expect(new ResourceExplanationService(llm).explain(['validation'],
      [{ candidateId: '00000000-0000-4000-8000-000000000001', resource: resourceFixture() }])).rejects.toThrow();
  });
  it('deduplicates in-flight provider requests and respects language-specific keys', async () => {
    const search = vi.fn(async () => { await new Promise(resolve => setTimeout(resolve, 15)); return [resourceFixture()]; });
    const retrieval = new ResourceRetrievalService([{ name: 'github', enabled: true, categories: ['GITHUB_REPOSITORY'], search }]);
    const queries = [{ provider: 'github', query: 'validation' }];
    const [a, b] = await Promise.all([retrieval.retrieve(queries, {}, ['GITHUB_REPOSITORY']),
      retrieval.retrieve(queries, {}, ['GITHUB_REPOSITORY'])]);
    expect(a.values).toHaveLength(1); expect(b.values).toHaveLength(1);
    expect(search).toHaveBeenCalledTimes(1);
    await retrieval.retrieve(queries, { languages: ['Python'] } as any, ['GITHUB_REPOSITORY']);
    expect(search).toHaveBeenCalledTimes(2);
  });
  it('bounds provider execution and reports partial failures independently', async () => {
    let active = 0; let maximum = 0;
    const providers = Array.from({ length: 7 }, (_, index) => ({
      name: `fixture_${index}`, enabled: true, categories: ['GITHUB_REPOSITORY'] as Provider['categories'],
      search: async () => {
        active++; maximum = Math.max(maximum, active);
        await new Promise(resolve => setTimeout(resolve, 10)); active--;
        if (index === 0) throw new Error('Upstream failure with private details');
        return [resourceFixture()];
      },
    }));
    const service = new ResourceRetrievalService(providers);
    const [result] = await Promise.all(['validation', 'interview'].map(query =>
      service.retrieve(providers.map(provider => ({ provider: provider.name, query })), {}, ['GITHUB_REPOSITORY'])));
    expect(maximum).toBeLessThanOrEqual(3); expect(result.available).toBe(true);
    expect(result.partial).toBe(true); expect(result.values).toHaveLength(1);
    expect(JSON.stringify(result.statuses)).not.toContain('private details');
  });
});
describe('Resource workflow persistence, compatibility and API filters', () => {
  let storage: Awaited<ReturnType<typeof isolatedDatabase>>; let app: ReturnType<typeof createApp>;
  let projectId: string; let resourceId: string;
  const provider: Provider = { name: 'github', enabled: true, categories: ['GITHUB_REPOSITORY'],
    search: async () => [resourceFixture({ externalId: 'one', url: 'https://github.com/example/one',
      sourceUpdatedAt: new Date('2025-01-01') }),
    resourceFixture({ externalId: 'two', name: 'validation', description: 'Validation', tags: [],
      url: 'https://github.com/example/two', sourceUpdatedAt: new Date('2026-01-01') })] };
  beforeAll(async () => {
    storage = await isolatedDatabase(); app = createApp({ db: storage.db, llm: new FixtureLLM(), providers: [provider] });
    projectId = (await request(app).post('/api/projects').send(projectInput)).body.data.id;
  }, 30000);
  afterAll(async () => { await storage.client.close(); });
  it('paginates persisted recommendations and exposes normalized field aliases', async () => {
    const result = await request(app).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation interview', categories: ['GITHUB_REPOSITORY'], limit: 1,
    });
    expect(result.status).toBe(201); expect(result.body.data.items).toHaveLength(1);
    expect(result.body.data.pagination.total).toBe(2);
    expect(result.body.data.items[0].resource.resource_url).toBe(result.body.data.items[0].resource.url);
    resourceId = result.body.data.items[0].resource.id;
    expect(result.body.data.items[0].explanation.generatedBy).toBe('AI');
    expect(result.body.data.items[0].explanation.metadataCitations).toHaveLength(1);
    expect(await storage.db.select().from(t.recommendations)).toHaveLength(2);
    expect(await storage.db.select().from(t.searchQueries)).toHaveLength(1);
  });
  it('supports provider/minimum-score filters and last-updated sorting', async () => {
    const path = `/api/projects/${projectId}/resources`;
    expect((await request(app).get(`${path}?provider=uci`)).body.data.items).toHaveLength(0);
    expect((await request(app).get(`${path}?minRelevance=100`)).body.data.items).toHaveLength(1);
    const sorted = await request(app).get(`${path}?sort=lastUpdated&limit=1`);
    expect(sorted.body.data.items[0].resource.externalId).toBe('two');
    expect((await request(app).get(`${path}?page=2&limit=1`)).body.data.items).toHaveLength(1);
    expect((await request(app).get(`${path}?minRelevance=101`)).status).toBe(400);
  });
  it('stores generated queries, provider parameters and cache diagnostics in paginated history', async () => {
    await request(app).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation interview', categories: ['GITHUB_REPOSITORY'], explain: false,
    });
    const history = await request(app).get(`/api/projects/${projectId}/resources/searches?limit=1`);
    expect(history.status).toBe(200); expect(history.body.data.items).toHaveLength(1);
    expect(history.body.data.items[0].queries[0]).toMatchObject({
      providerId: 'github', query: 'validation interview', cached: true, status: 'OK',
    });
    expect(await storage.db.select().from(t.resources)).toHaveLength(2);
  });
  it('saves and removes by the new aliases without losing old save behavior', async () => {
    expect((await request(app).post(`/api/resources/${resourceId}/save`).send({ projectId })).status).toBe(200);
    expect((await request(app).get(`/api/projects/${projectId}/resources/saved`)).body.data.items).toHaveLength(1);
    expect((await request(app).delete(`/api/resources/${resourceId}/save`).send({ projectId })).status).toBe(200);
    expect((await request(app).get(`/api/projects/${projectId}/resources/saved`)).body.data.items).toHaveLength(0);
  });
  it('reuses global resource identities across projects, preserving search snapshots', async () => {
    const other = (await request(app).post('/api/projects').send(projectInput)).body.data.id;
    await request(app).post(`/api/projects/${other}/resources/search`).send({
      query: 'validation', categories: ['GITHUB_REPOSITORY'], explain: false,
    });
    expect(await storage.db.select().from(t.resources)).toHaveLength(2);
    await storage.db.update(t.resources).set({ description: 'A later changed global description' }).where(eq(t.resources.id, resourceId));
    const current = await request(app).get(`/api/projects/${projectId}/resources`);
    expect(current.body.data.items.find((row: any) => row.resource.id === resourceId).resource.description)
      .not.toBe('A later changed global description');
  });
  it('stores all-failed diagnostics before returning the existing 503 error', async () => {
    const broken: Provider = { ...provider, name: 'unavailable', search: async () => {
      throw new ApiError(502, 'PROVIDER_TIMEOUT', 'No raw upstream messages');
    } };
    const failed = createApp({ db: storage.db, llm: new FixtureLLM(), providers: [broken] });
    expect((await request(failed).post(`/api/projects/${projectId}/resources/search`).send({
      query: 'validation', explain: false,
    })).status).toBe(503);
    const history = await request(app).get(`/api/projects/${projectId}/resources/searches?limit=1`);
    expect(history.body.data.items[0].status).toBe('FAILED');
    expect(history.body.data.items[0].queries[0].error).toBe('PROVIDER_TIMEOUT');
    expect((await request(app).get(`/api/projects/${projectId}/resources`)).body.data.items).toHaveLength(2);
  });
});
