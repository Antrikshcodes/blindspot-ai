import { z } from 'zod';
import { config } from '../config.js';
import { HttpClient, ProviderError } from './http.js';
import { type Provider, type Resource, type Category, type ProviderOptions, unknownSignals, dateOrNull } from './types.js';
import { ApiError } from '../config.js';
import { ApisGuruProvider } from './apis-guru.provider.js';

const s = z.string().nullish();
const n = z.number().nonnegative().nullish();
const headers = (token?: string): Record<string, string> => token ? { Authorization: `Bearer ${token}` } : {};
const safeId = (id: string) => /^[\w][\w.-]*\/[\w][\w.-]*$/.test(id);
const githubItem = z.object({
  id: z.number(), full_name: z.string(), description: s, html_url: z.string(),
  stargazers_count: n, forks_count: n, language: s, topics: z.array(z.string()).optional(),
  pushed_at: s, updated_at: s, archived: z.boolean().optional(), private: z.boolean().optional(),
  created_at: s, open_issues_count: n,
  license: z.object({ spdx_id: s, name: s }).nullish(),
});
export class GithubProvider implements Provider {
  name = 'github'; categories: Category[] = ['GITHUB_REPOSITORY', 'OPEN_SOURCE_TOOL']; enabled = true;
  constructor(private http: HttpClient) {}
  private normalize(item: z.infer<typeof githubItem>, sourceApiUrl: string): Resource {
    return {
      category: 'GITHUB_REPOSITORY', provider: this.name, externalId: String(item.id),
      url: item.html_url, name: item.full_name, description: (item.description ?? '').slice(0, 5000),
      license: item.license?.spdx_id && item.license.spdx_id !== 'NOASSERTION' ? item.license.spdx_id : null,
      language: item.language ?? null, tags: (item.topics ?? []).slice(0, 100),
      sourceApiUrl, sourceCreatedAt: dateOrNull(item.created_at),
      sourceUpdatedAt: dateOrNull(item.pushed_at), retrievedAt: new Date(),
      qualitySignals: { ...unknownSignals(), archived: item.archived ?? null,
        stars: item.stargazers_count ?? null, forks: item.forks_count ?? null },
      sourceMetadata: { owner: item.full_name.split('/')[0], metadataUpdatedAt: item.updated_at ?? null,
        openIssues: item.open_issues_count ?? null,
        warnings: item.archived ? ['Archived repository; maintenance should not be assumed.'] : [] },
    };
  }
  async getRepository(owner: string, repository: string): Promise<Resource> {
    if (!safeId(`${owner}/${repository}`)) throw new ApiError(400, 'INVALID_REPOSITORY', 'Invalid repository identity.');
    const url = `https://api.github.com/repos/${owner}/${repository}`;
    const item = githubItem.parse(await this.http.json(url, headers(config.GITHUB_TOKEN)));
    if (item.private) throw new ApiError(404, 'NOT_FOUND', 'Only public repositories are supported.');
    return this.normalize(item, url);
  }
  async search(query: string, languages: string[], options: ProviderOptions = {}): Promise<Resource[]> {
    const language = languages[0]?.replace(/[^a-zA-Z0-9+#.-]/g, '');
    const topics = (options.topics ?? []).filter(topic => /^[\w-]{1,40}$/.test(topic)).map(topic => ` topic:${topic}`).join('');
    const q = `${query} is:public${options.includeArchived ? '' : ' archived:false'}${language ? ` language:${language}` : ''}${topics}`;
    const sourceApiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=${Math.min(options.limit ?? config.PROVIDER_PAGE_SIZE, 10)}&page=${Math.min(options.page ?? 1, 100)}`;
    const data = z.object({ items: z.array(githubItem) }).parse(await this.http.json(
      sourceApiUrl,
      { Accept: 'application/vnd.github+json', ...headers(config.GITHUB_TOKEN) },
    ));
    return data.items.filter(item => !item.private && (options.includeArchived || !item.archived))
      .map(item => this.normalize(item, sourceApiUrl));
  }
}
const hubItem = z.object({
  id: z.string(), description: s, likes: n, downloads: n, lastModified: s,
  tags: z.array(z.string()).optional(), pipeline_tag: s, private: z.boolean().optional(),
  library_name: s, createdAt: s,
  gated: z.union([z.boolean(), z.string()]).nullish(),
  cardData: z.object({ license: z.union([z.string(), z.array(z.string())]).nullish(), pretty_name: s }).passthrough().nullish(),
  siblings: z.array(z.object({ rfilename: z.string() })).optional(),
});
export class HuggingFaceProvider implements Provider {
  identity = 'huggingface';
  name: string; categories: Category[]; enabled = true;
  constructor(private http: HttpClient, private kind: 'models' | 'datasets') {
    this.name = `huggingface_${kind}`;
    this.categories = [kind === 'models' ? 'AI_MODEL' : 'DATASET'];
  }
  async search(query: string, _languages: string[] = [], options: ProviderOptions = {}): Promise<Resource[]> {
    const task = this.kind === 'models' && options.tasks?.length === 1 ? options.tasks[0] : undefined;
    const sourceApiUrl = `https://huggingface.co/api/${this.kind}?search=${encodeURIComponent(query)}&limit=${Math.min(options.limit ?? config.PROVIDER_PAGE_SIZE, 10)}&full=true&cardData=true${task ? `&filter=${encodeURIComponent(task)}` : ''}`;
    const rows = z.array(hubItem).parse(await this.http.json(
      sourceApiUrl,
      headers(config.HUGGINGFACE_TOKEN),
    ));
    const results: Resource[] = [];
    for (const item of rows.filter(row => !row.private && safeId(row.id)
      && !(this.kind === 'models' && options.tasks?.length && row.pipeline_tag
        && !options.tasks.includes(row.pipeline_tag))).slice(0, options.limit ?? config.PROVIDER_PAGE_SIZE)) {
      const license = item.cardData?.license;
      let cardExcerpt: string | null = null;
      let documentation: boolean | null = item.siblings ? item.siblings.some(f => f.rfilename === 'README.md') : null;
      try {
        const prefix = this.kind === 'datasets' ? 'datasets/' : '';
        if (results.length < 2) {
          cardExcerpt = (await this.http.request(`https://huggingface.co/${prefix}${item.id}/raw/main/README.md`,
            headers(config.HUGGINGFACE_TOKEN))).slice(0, 1500);
          documentation = true;
        }
      } catch { /* Unknown is preserved; never infer a license from an unread card. */ }
      results.push({
        category: this.kind === 'models' ? 'AI_MODEL' : 'DATASET',
        provider: 'huggingface', externalId: `${this.kind}/${item.id}`,
        url: `https://huggingface.co/${this.kind === 'datasets' ? 'datasets/' : ''}${item.id}`,
        name: item.cardData?.pretty_name ?? item.id, description: (item.description ?? '').slice(0, 5000),
        license: typeof license === 'string' ? license : Array.isArray(license) ? license.join(', ') : null,
        language: null, tags: (item.tags ?? []).slice(0, 100), sourceUpdatedAt: dateOrNull(item.lastModified), retrievedAt: new Date(),
        sourceApiUrl, sourceCreatedAt: dateOrNull(item.createdAt),
        qualitySignals: { ...unknownSignals(), documentation, downloads: item.downloads ?? null,
          likes: item.likes ?? null, task: item.pipeline_tag ?? null },
        sourceMetadata: { modelId: item.id, library: item.library_name ?? null, gated: item.gated ?? null,
          cardData: item.cardData ?? null, modelCardExcerpt: cardExcerpt, cardChecked: cardExcerpt !== null },
      });
    }
    return results;
  }
}
export class KaggleProvider implements Provider {
  name = 'kaggle'; categories: Category[] = ['DATASET'];
  enabled: boolean; disabledReason?: string;
  private username?: string; private key?: string;
  constructor(private http: HttpClient, settings?: { enabled: boolean; username?: string; key?: string }) {
    this.username = settings?.username ?? config.KAGGLE_USERNAME;
    this.key = settings?.key ?? config.KAGGLE_KEY;
    this.enabled = (settings?.enabled ?? config.KAGGLE_ENABLED === 'true') && Boolean(this.username && this.key);
    if (!this.enabled) this.disabledReason = 'KAGGLE_NOT_CONFIGURED';
  }
  async search(query: string, _languages: string[] = [], options: ProviderOptions = {}): Promise<Resource[]> {
    if (!this.enabled) throw new ApiError(503, 'PROVIDER_DISABLED', 'Kaggle credentials are not configured or were rejected.');
    const auth = { Authorization: `Basic ${Buffer.from(`${this.username}:${this.key}`).toString('base64')}` };
    const sourceApiUrl = `https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(query)}&pageSize=${Math.min(options.limit ?? config.PROVIDER_PAGE_SIZE, 10)}&page=${options.page ?? 1}`;
    let payload: unknown;
    try { payload = await this.http.json(sourceApiUrl, auth); }
    catch (error) {
      if (error instanceof ProviderError && (error.upstreamStatus === 401 || error.upstreamStatus === 403)) {
        this.enabled = false; this.disabledReason = 'KAGGLE_AUTH_REJECTED';
      }
      throw error;
    }
    const rows = z.array(z.object({
      ref: z.string(), title: z.string(), subtitle: s, description: s, url: s,
      licenseName: s, lastUpdated: s, totalBytes: n, downloadCount: n, isPrivate: z.boolean().optional(),
      files: z.array(z.object({ name: s, totalBytes: n }).passthrough()).optional(),
    })).parse(payload);
    return rows.filter(row => !row.isPrivate && safeId(row.ref)).map(row => ({
      category: 'DATASET', provider: 'kaggle', externalId: row.ref,
      url: row.url ?? `https://www.kaggle.com/datasets/${row.ref}`,
      name: row.title, description: (row.description || row.subtitle || '').slice(0, 5000),
      license: row.licenseName ?? null, language: null, tags: [],
      sourceApiUrl, sourceCreatedAt: null,
      sourceUpdatedAt: dateOrNull(row.lastUpdated), retrievedAt: new Date(),
      qualitySignals: { ...unknownSignals(), sizeBytes: row.totalBytes ?? null, downloads: row.downloadCount ?? null },
      sourceMetadata: { owner: row.ref.split('/')[0], files: row.files ?? null, access: 'authenticated_public_metadata_only' },
    }));
  }
}
export class UciProvider implements Provider {
  name = 'uci'; categories: Category[] = ['DATASET']; enabled = true;
  constructor(private http: HttpClient) {}
  async search(query: string, _languages: string[] = [], options: ProviderOptions = {}): Promise<Resource[]> {
    const listing = z.object({ data: z.array(z.object({ id: z.number().int().positive(), name: z.string() })) })
      .parse(await this.http.json(`https://archive.ics.uci.edu/api/datasets/list?search=${encodeURIComponent(query)}`));
    const resources: Resource[] = [];
    for (const row of listing.data.slice(0, Math.min(options.limit ?? 3, 5))) {
      const data = z.object({ data: z.object({
        repository_url: z.string(), name: z.string(), abstract: s, last_updated: s,
        tasks: z.array(z.string()).optional(), num_instances: n, num_features: n,
        area: s, license: s, feature_types: z.array(z.string()).optional(),
        variables: z.array(z.object({ name: s, role: s, type: s })).optional(),
      }) }).parse(await this.http.json(`https://archive.ics.uci.edu/api/dataset?id=${row.id}`));
      resources.push({
        category: 'DATASET', provider: this.name, externalId: String(row.id),
        url: data.data.repository_url, name: data.data.name, description: (data.data.abstract ?? '').slice(0, 5000),
        license: data.data.license ?? null, language: null, tags: [...(data.data.tasks ?? []), ...(data.data.area ? [data.data.area] : [])],
        sourceApiUrl: `https://archive.ics.uci.edu/api/dataset?id=${row.id}`, sourceCreatedAt: null,
        sourceUpdatedAt: dateOrNull(data.data.last_updated), retrievedAt: new Date(),
        qualitySignals: unknownSignals(),
        sourceMetadata: { rows: data.data.num_instances ?? null, features: data.data.num_features ?? null,
          subject: data.data.area ?? null, featureTypes: data.data.feature_types ?? null,
          variables: data.data.variables?.slice(0, 50) ?? null, tasks: data.data.tasks ?? null,
          licenseNote: 'License not returned by this endpoint; inspect the source page.' },
      });
    }
    return resources;
  }
}
export const catalog: Array<{ name: string; url: string; category: Category; keywords: string[] }> = [
  { name: 'Hugging Face Inference Providers', url: 'https://huggingface.co/docs/inference-providers/index',
    category: 'API', keywords: ['nlp', 'classification', 'embedding', 'model', 'image', 'inference'] },
  { name: 'GitHub REST API documentation', url: 'https://docs.github.com/en/rest',
    category: 'DOCUMENTATION', keywords: ['github', 'repository', 'code', 'developer'] },
  { name: 'MDN Web APIs reference', url: 'https://developer.mozilla.org/en-US/docs/Web/API',
    category: 'DOCUMENTATION', keywords: ['web', 'browser', 'notification', 'camera', 'location'] },
  { name: 'scikit-learn', url: 'https://scikit-learn.org/stable/',
    category: 'OPEN_SOURCE_TOOL', keywords: ['classification', 'machine learning', 'regression', 'detection'] },
  { name: 'PyTorch tutorials', url: 'https://pytorch.org/tutorials/',
    category: 'LEARNING_RESOURCE', keywords: ['neural', 'deep learning', 'model', 'image', 'pytorch'] },
];
export class TechnicalProvider implements Provider {
  name = 'technical'; enabled = true;
  categories: Category[] = ['API', 'DOCUMENTATION', 'OPEN_SOURCE_TOOL', 'LEARNING_RESOURCE'];
  constructor(private http: HttpClient, private entries = catalog) {}
  async search(query: string): Promise<Resource[]> {
    const matches = this.entries.filter(row => row.keywords.some(word => query.toLowerCase().includes(word)));
    const results: Resource[] = [];
    for (const row of matches.slice(0, 4)) {
      try {
        await this.http.request(row.url, {}, 'HEAD');
        results.push({
          category: row.category, provider: this.name, externalId: row.url, url: row.url, name: row.name,
          description: 'Curated official technical resource; destination availability checked at retrieval.',
          license: null, language: null, tags: row.keywords, sourceUpdatedAt: null, retrievedAt: new Date(),
          sourceApiUrl: row.url, sourceCreatedAt: null,
          qualitySignals: { ...unknownSignals(), documentation: true },
          sourceMetadata: { catalog: 'reviewed_official_destinations', verification: 'HTTP_HEAD_success' },
        });
      } catch { /* Do not return an unverified curated destination as retrieved. */ }
    }
    return results;
  }
}
export function defaultProviders(http = new HttpClient()): Provider[] {
  return [new GithubProvider(http), new HuggingFaceProvider(http, 'models'),
    new HuggingFaceProvider(http, 'datasets'), new UciProvider(http), new KaggleProvider(http),
    new ApisGuruProvider(http), new TechnicalProvider(http)];
}
