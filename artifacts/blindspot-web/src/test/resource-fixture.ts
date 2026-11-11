import type {
  ProviderStatus, Resource, ResourceCategory, ResourceListItem, ResourceSearch, ResourceSearchHistory, SearchItem,
} from '@workspace/api-client-react';

// Synthetic contract fixtures only; never imported by production screens.
export const resourceId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const resourceProjectId = resourceId(1);
const date = '2026-11-01T12:00:00.000Z';
export function makeResource(n: number, category: ResourceCategory, provider: string, extra: Partial<Resource> = {}): Resource {
  return {
    id: resourceId(n), provider, externalId: `TEST_ONLY_${n}`, category,
    url: `https://example.com/test-only-resource-${n}`, name: `TEST ONLY resource ${n}`,
    description: 'Search-time provider description, not a security endorsement.',
    license: null, language: null, sourceUpdatedAt: null, retrievedAt: date, tags: [],
    qualitySignals: { stars: null, forks: null, downloads: null, likes: null, archived: null, documentation: null, task: null, sizeBytes: null },
    sourceMetadata: {}, ...extra,
  };
}
export function searchItem(resource: Resource, score: number): SearchItem {
  return {
    id: resourceId(100 + score), searchId: resourceId(40), resourceId: resource.id,
    relevanceScore: score, qualityScore: 50, rankScore: score,
    ranking: { technicalCompatibility: 'COMPATIBLE', rationale: 'TEST ONLY backend rank' },
    sourceSnapshot: { ...resource }, explanation: null, resource,
  };
}
export function history(n: number, query: string, statuses: ProviderStatus[], failed = false): ResourceSearchHistory {
  return {
    id: resourceId(n), projectId: resourceProjectId, query, createdAt: date,
    requirements: [query], analysisId: null, queryPlan: { queries: [] },
    providerStatuses: statuses, status: failed ? 'FAILED' : 'COMPLETED',
    partial: statuses.some((status) => status.status !== 'OK'), cached: false,
    explanationStatus: 'NOT_REQUESTED',
    queries: statuses.map((status, index) => ({
      id: resourceId(n * 10 + index), searchId: resourceId(n), providerId: status.provider,
      adapterName: status.provider, query, parameters: { page: 1, limit: 2 },
      status: status.status === 'OK' ? 'OK' : 'FAILED', count: status.count,
      durationMs: 10, cached: false, error: status.error ?? null, retryAfterSeconds: null,
    })),
  };
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(
  status < 400 ? { success: true, data } : { success: false, ...data as object },
), { status, headers: { 'Content-Type': 'application/json' } });

export class ResourceFixture {
  resources = [
    makeResource(10, 'GITHUB_REPOSITORY', 'github', { url: 'https://github.com/facebook/react', language: 'JavaScript', qualitySignals: { stars: 0, documentation: true, archived: false } }),
    makeResource(11, 'AI_MODEL', 'huggingface_models', { url: 'https://huggingface.co/google-bert/bert-base-uncased', qualitySignals: { downloads: 42, stars: null } }),
    makeResource(12, 'DATASET', 'huggingface_datasets', { url: 'https://huggingface.co/datasets/stanfordnlp/imdb' }),
    makeResource(13, 'API', 'apis_guru', { url: 'https://www.weather.gov/documentation/services-web-api' }),
  ];
  items = [searchItem(this.resources[1], 90), searchItem(this.resources[0], 80), searchItem(this.resources[2], 60), searchItem(this.resources[3], 40)];
  statuses: ProviderStatus[] = [{ provider: 'github', status: 'OK', count: 7, queries: 1 }, { provider: 'kaggle', status: 'DISABLED', count: 0, error: 'KAGGLE_NOT_CONFIGURED' }];
  histories = [history(40, 'react tooling', this.statuses), history(39, 'iris datasets', [{ provider: 'uci', status: 'OK', count: 2 }])];
  calls: { method: string; path: string; body?: Record<string, unknown>; params: URLSearchParams }[] = [];
  access: 401 | 404 | 503 | null = null;
  failSearch = false;
  failDetail = false;
  failList = false;
  emptySearch = false;
  searchGate: Promise<void> | null = null;
  private sequence = 42;
  fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://fixture.invalid');
    const path = url.pathname;
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
    this.calls.push({ method, path, body, params: url.searchParams });
    const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);
    if (this.access) return fail(this.access, this.access === 404 ? 'NOT_FOUND' : 'AUTH_NOT_READY', 'Private project access is unavailable.');
    if (path === `/api/projects/${resourceProjectId}`) return json({ id: resourceProjectId, name: 'TEST ONLY resource project', createdAt: date });
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    if (path === `/api/projects/${resourceProjectId}/resources/searches`) return json({
      items: this.histories.slice((page - 1) * limit, page * limit), pagination: { page, limit },
    });
    if (path === `/api/projects/${resourceProjectId}/resources/search` && method === 'POST') {
      if (this.searchGate) await this.searchGate;
      const searchId = resourceId(this.sequence++);
      const query = typeof body?.query === 'string' ? body.query.trim() : 'Derived project requirements';
      if (!query || query.length > 150) return fail(400, 'VALIDATION_ERROR', 'Use a query of 1 to 150 characters.');
      this.histories.unshift({ ...history(this.sequence - 1, query, this.statuses, this.failSearch), id: searchId });
      if (this.failSearch) return fail(503, 'RESOURCE_PROVIDERS_UNAVAILABLE', 'No enabled resource provider completed successfully. Search diagnostics are available in project search history.');
      if (this.emptySearch) this.items = [];
      this.items = this.items.map((item) => ({ ...item, searchId }));
      const result: ResourceSearch = {
        searchId, projectId: resourceProjectId, query, requirements: [query], cached: false, partial: true,
        providerStatuses: this.statuses, explanationStatus: 'NOT_REQUESTED', items: this.items,
        pagination: { page: 1, limit: 20, total: this.items.length }, generatedQueries: [],
      };
      return json(result, 201);
    }
    if (path === `/api/projects/${resourceProjectId}/resources`) {
      if (this.failList) return fail(503, 'UNAVAILABLE', 'Collection could not be loaded.');
      const filtered = this.items.filter((item) =>
        (!url.searchParams.get('category') || item.resource.category === url.searchParams.get('category')) &&
        (!url.searchParams.get('provider') || item.resource.provider === url.searchParams.get('provider')) &&
        item.relevanceScore >= Number(url.searchParams.get('minRelevance') ?? 0));
      const items: ResourceListItem[] = filtered.slice((page - 1) * limit, page * limit).map(({ resource, ...recommendation }) => ({ resource, recommendation, saved: null }));
      return json({ items, pagination: { page, limit } });
    }
    if (/^\/api\/resources\/[^/]+$/.test(path)) {
      if (this.failDetail) return fail(404, 'NOT_FOUND', 'Resource not found.');
      const resource = this.resources.find((row) => row.id === path.split('/').at(-1));
      if (!resource) return fail(404, 'NOT_FOUND', 'Resource not found.');
      return json({ ...resource, description: `Current metadata for ${resource.name}. Not verified.` });
    }
    throw new Error(`Unexpected resource fixture request: ${method} ${path}`);
  };
}
