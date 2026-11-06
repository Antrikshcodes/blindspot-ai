import { z } from 'zod';
import { config } from '../config.js';
import { HttpClient } from './http.js';
import { type Provider, type Resource, type Category, unknownSignals, dateOrNull } from './types.js';

const s = z.string().nullish();
const n = z.number().nullish();
const headers = (token?: string): Record<string, string> => token ? { Authorization: `Bearer ${token}` } : {};
const safeId = (id: string) => /^[\w.-]+\/[\w.-]+$/.test(id);
const githubItem = z.object({
  id: z.number(), full_name: z.string(), description: s, html_url: z.string(),
  stargazers_count: n, forks_count: n, language: s, topics: z.array(z.string()).optional(),
  pushed_at: s, updated_at: s, archived: z.boolean().optional(), private: z.boolean().optional(),
  license: z.object({ spdx_id: s, name: s }).nullish(),
});
export class GithubProvider implements Provider {
  name = 'github'; categories: Category[] = ['GITHUB_REPOSITORY', 'OPEN_SOURCE_TOOL']; enabled = true;
  constructor(private http: HttpClient) {}
  async search(query: string, languages: string[]): Promise<Resource[]> {
    const language = languages[0]?.replace(/[^a-zA-Z0-9+#.-]/g, '');
    const q = `${query} is:public${language ? ` language:${language}` : ''}`;
    const data = z.object({ items: z.array(githubItem) }).parse(await this.http.json(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=5`,
      { Accept: 'application/vnd.github+json', ...headers(config.GITHUB_TOKEN) },
    ));
    return data.items.filter(item => !item.private).map(item => ({
      category: 'GITHUB_REPOSITORY', provider: this.name, externalId: String(item.id),
      url: item.html_url, name: item.full_name, description: (item.description ?? '').slice(0, 5000),
      license: item.license?.spdx_id && item.license.spdx_id !== 'NOASSERTION' ? item.license.spdx_id : null,
      language: item.language ?? null, tags: item.topics ?? [],
      sourceUpdatedAt: dateOrNull(item.pushed_at), retrievedAt: new Date(),
      qualitySignals: {
        ...unknownSignals(), archived: item.archived ?? null, stars: item.stargazers_count ?? null,
        forks: item.forks_count ?? null,
      },
      sourceMetadata: { owner: item.full_name.split('/')[0], metadataUpdatedAt: item.updated_at ?? null },
    }));
  }
}
const hubItem = z.object({
  id: z.string(), description: s, likes: n, downloads: n, lastModified: s,
  tags: z.array(z.string()).optional(), pipeline_tag: s, private: z.boolean().optional(),
  cardData: z.object({ license: z.union([z.string(), z.array(z.string())]).nullish(), pretty_name: s }).passthrough().nullish(),
  siblings: z.array(z.object({ rfilename: z.string() })).optional(),
});
export class HuggingFaceProvider implements Provider {
  name: string; categories: Category[]; enabled = true;
  constructor(private http: HttpClient, private kind: 'models' | 'datasets') {
    this.name = `huggingface_${kind}`;
    this.categories = [kind === 'models' ? 'AI_MODEL' : 'DATASET'];
  }
  async search(query: string): Promise<Resource[]> {
    const rows = z.array(hubItem).parse(await this.http.json(
      `https://huggingface.co/api/${this.kind}?search=${encodeURIComponent(query)}&limit=4&full=true&cardData=true`,
      headers(config.HUGGINGFACE_TOKEN),
    ));
    const results: Resource[] = [];
    for (const item of rows.filter(row => !row.private && safeId(row.id))) {
      const license = item.cardData?.license;
      let cardExcerpt: string | null = null;
      let documentation: boolean | null = item.siblings ? item.siblings.some(f => f.rfilename === 'README.md') : null;
      try {
        const prefix = this.kind === 'datasets' ? 'datasets/' : '';
        cardExcerpt = (await this.http.request(`https://huggingface.co/${prefix}${item.id}/raw/main/README.md`,
          headers(config.HUGGINGFACE_TOKEN))).slice(0, 1500);
        documentation = true;
      } catch { /* Unknown is preserved; never infer a license from an unread card. */ }
      results.push({
        category: this.kind === 'models' ? 'AI_MODEL' : 'DATASET',
        provider: 'huggingface', externalId: `${this.kind}/${item.id}`,
        url: `https://huggingface.co/${this.kind === 'datasets' ? 'datasets/' : ''}${item.id}`,
        name: item.cardData?.pretty_name ?? item.id, description: (item.description ?? '').slice(0, 5000),
        license: typeof license === 'string' ? license : Array.isArray(license) ? license.join(', ') : null,
        language: null, tags: item.tags ?? [], sourceUpdatedAt: dateOrNull(item.lastModified), retrievedAt: new Date(),
        qualitySignals: { ...unknownSignals(), documentation, downloads: item.downloads ?? null,
          likes: item.likes ?? null, task: item.pipeline_tag ?? null },
        sourceMetadata: { modelCardExcerpt: cardExcerpt, cardChecked: cardExcerpt !== null },
      });
    }
    return results;
  }
}
export class KaggleProvider implements Provider {
  name = 'kaggle'; categories: Category[] = ['DATASET'];
  enabled = config.KAGGLE_ENABLED === 'true';
  constructor(private http: HttpClient) {}
  async search(query: string): Promise<Resource[]> {
    const auth: Record<string, string> = config.KAGGLE_USERNAME && config.KAGGLE_KEY
      ? { Authorization: `Basic ${Buffer.from(`${config.KAGGLE_USERNAME}:${config.KAGGLE_KEY}`).toString('base64')}` } : {};
    const rows = z.array(z.object({
      ref: z.string(), title: z.string(), subtitle: s, description: s, url: s,
      licenseName: s, lastUpdated: s, totalBytes: n, downloadCount: n, isPrivate: z.boolean().optional(),
    })).parse(await this.http.json(`https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(query)}&pageSize=4`, auth));
    return rows.filter(row => !row.isPrivate && safeId(row.ref)).map(row => ({
      category: 'DATASET', provider: 'kaggle', externalId: row.ref,
      url: row.url ?? `https://www.kaggle.com/datasets/${row.ref}`,
      name: row.title, description: (row.description || row.subtitle || '').slice(0, 5000),
      license: row.licenseName ?? null, language: null, tags: [],
      sourceUpdatedAt: dateOrNull(row.lastUpdated), retrievedAt: new Date(),
      qualitySignals: { ...unknownSignals(), sizeBytes: row.totalBytes ?? null, downloads: row.downloadCount ?? null },
      sourceMetadata: { access: 'public_metadata_only' },
    }));
  }
}
export class UciProvider implements Provider {
  name = 'uci'; categories: Category[] = ['DATASET']; enabled = true;
  constructor(private http: HttpClient) {}
  async search(query: string): Promise<Resource[]> {
    const listing = z.object({ data: z.array(z.object({ id: z.number().int().positive(), name: z.string() })) })
      .parse(await this.http.json(`https://archive.ics.uci.edu/api/datasets/list?search=${encodeURIComponent(query)}`));
    const resources: Resource[] = [];
    for (const row of listing.data.slice(0, 3)) {
      const data = z.object({ data: z.object({
        repository_url: z.string(), name: z.string(), abstract: s, last_updated: s,
        tasks: z.array(z.string()).optional(), num_instances: n, num_features: n,
      }) }).parse(await this.http.json(`https://archive.ics.uci.edu/api/dataset?id=${row.id}`));
      resources.push({
        category: 'DATASET', provider: this.name, externalId: String(row.id),
        url: data.data.repository_url, name: data.data.name, description: (data.data.abstract ?? '').slice(0, 5000),
        license: null, language: null, tags: data.data.tasks ?? [],
        sourceUpdatedAt: dateOrNull(data.data.last_updated), retrievedAt: new Date(),
        qualitySignals: unknownSignals(),
        sourceMetadata: { rows: data.data.num_instances ?? null, features: data.data.num_features ?? null,
          licenseNote: 'License not returned by this endpoint; inspect the source page.' },
      });
    }
    return resources;
  }
}
const catalog: Array<{ name: string; url: string; category: Category; keywords: string[] }> = [
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
  constructor(private http: HttpClient) {}
  async search(query: string): Promise<Resource[]> {
    const matches = catalog.filter(row => row.keywords.some(word => query.toLowerCase().includes(word)));
    const results: Resource[] = [];
    for (const row of matches.slice(0, 4)) {
      try {
        await this.http.request(row.url, {}, 'HEAD');
        results.push({
          category: row.category, provider: this.name, externalId: row.url, url: row.url, name: row.name,
          description: 'Curated official technical resource; destination availability checked at retrieval.',
          license: null, language: null, tags: row.keywords, sourceUpdatedAt: null, retrievedAt: new Date(),
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
    new TechnicalProvider(http)];
}
