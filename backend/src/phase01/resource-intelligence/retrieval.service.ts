import { config, ApiError } from '../config.js';
import { batchProcess } from '../ai/batch.js';
import { ResourceCache } from './cache.js';
import { ProviderError } from './http.js';
import { deduplicate } from './normalize.js';
import type { Provider, ProviderOptions, Resource } from './types.js';
import type { PlannedQuery } from './query.service.js';

export type QueryResult = {
  provider: string; providerId: string; query: string; parameters: ProviderOptions;
  status: 'OK' | 'FAILED' | 'DISABLED'; count: number; durationMs: number;
  cached: boolean; error?: string; retryAfterSeconds?: number;
};
export class ResourceRetrievalService {
  private cache = new ResourceCache<Resource[]>();
  private cooldown = new Map<string, number>();
  private budget = import('p-limit').then(module => module.default(config.PROVIDER_CONCURRENCY));
  constructor(private providers: Provider[]) {}
  async retrieve(queries: PlannedQuery[], options: ProviderOptions, categories: string[]) {
    const rows = await batchProcess(queries, async row => {
      const provider = this.providers.find(provider => provider.name === row.provider)!;
      const started = Date.now();
      const base = { ...row, providerId: provider.identity ?? provider.name, parameters: options,
        count: 0, cached: false, durationMs: 0 };
      if (!provider.enabled) return { values: [] as Resource[], diagnostic: {
        ...base, status: 'DISABLED' as const, error: provider.disabledReason ?? 'PROVIDER_DISABLED' } };
      if ((this.cooldown.get(provider.name) ?? 0) > Date.now()) return { values: [] as Resource[], diagnostic: {
        ...base, status: 'FAILED' as const, error: 'PROVIDER_RATE_LIMITED',
        retryAfterSeconds: Math.ceil((this.cooldown.get(provider.name)! - Date.now()) / 1000) } };
      const key = JSON.stringify(['phase03-provider-1', provider.name, row.query.toLowerCase(), options]);
      try {
        const result = await this.cache.resolve(key, async () => {
          const raw = await (await this.budget)(() => provider.search(row.query, optionsLanguages(options), options));
          const normalized = deduplicate(raw);
          if (raw.length && !normalized.length) {
            throw new ApiError(502, 'PROVIDER_INVALID_RESOURCES', 'Provider returned no valid normalized resources.');
          }
          return normalized.filter(resource => options.includeArchived || resource.qualitySignals.archived !== true);
        });
        const values = result.value.filter(resource => categories.includes(resource.category));
        return { values, diagnostic: { ...base, status: 'OK' as const, count: values.length,
          cached: result.cached, durationMs: Date.now() - started } };
      } catch (error) {
        const retryAfterSeconds = error instanceof ProviderError ? error.retryAfterSeconds : undefined;
        if (error instanceof ProviderError && error.code === 'PROVIDER_RATE_LIMITED') {
          this.cooldown.set(provider.name, Date.now() + Math.min(retryAfterSeconds ?? 60, 3600) * 1000);
        }
        return { values: [] as Resource[], diagnostic: {
          ...base, status: provider.enabled ? 'FAILED' as const : 'DISABLED' as const,
          error: !provider.enabled ? provider.disabledReason : error instanceof ApiError ? error.code : 'PROVIDER_RESPONSE_INVALID',
          retryAfterSeconds, durationMs: Date.now() - started,
        } };
      }
    }, { concurrency: config.PROVIDER_CONCURRENCY, retries: 0 });
    const diagnostics: QueryResult[] = rows.map(row => row.diagnostic);
    const statuses = [...new Set(diagnostics.map(row => row.provider))].map(provider => {
      const data = diagnostics.filter(row => row.provider === provider);
      const ok = data.filter(row => row.status === 'OK');
      const status = ok.length === data.length ? 'OK' : ok.length ? 'PARTIAL'
        : data.every(row => row.status === 'DISABLED') ? 'DISABLED' : 'FAILED';
      return { provider, status, count: data.reduce((sum, row) => sum + row.count, 0),
        ...(data.some(row => row.error) ? { error: data.find(row => row.error)!.error } : {}),
        queries: data.length };
    });
    return { values: deduplicate(rows.flatMap(row => row.values)), statuses, diagnostics,
      cached: diagnostics.some(row => row.cached), partial: statuses.some(row => row.status !== 'OK'),
      available: statuses.some(row => row.status === 'OK' || row.status === 'PARTIAL') };
  }
}
// Languages belong in the provider-specific cache key as well as adapter calls.
export type RetrievalOptions = ProviderOptions & { languages?: string[] };
function optionsLanguages(options: ProviderOptions) { return (options as RetrievalOptions).languages ?? []; }
