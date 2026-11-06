import { z } from 'zod';
import { HttpClient } from './http.js';
import { ResourceCache } from './cache.js';
import { publicHttpsUrl } from './normalize.js';
import { terms, matchesTerm } from './ranking.js';
import { type Provider, type Resource, type Category, type ProviderOptions, unknownSignals, dateOrNull } from './types.js';

const directoryUrl = 'https://api.apis.guru/v2/list.json';
const versionSchema = z.object({
  info: z.object({
    title: z.string(), description: z.string().nullish(),
    'x-providerName': z.string().optional(),
    'x-apisguru-categories': z.array(z.string()).optional(),
    license: z.object({ name: z.string().optional(), url: z.string().optional() }).optional(),
  }),
  externalDocs: z.object({ url: z.string() }).optional(),
  swaggerUrl: z.string(), updated: z.string().optional(), added: z.string().optional(),
});
const directorySchema = z.record(z.string(), z.object({
  preferred: z.string(), versions: z.record(z.string(), z.unknown()),
}));
export class ApisGuruProvider implements Provider {
  name = 'apis_guru'; enabled = true; categories: Category[] = ['API'];
  private directory = new ResourceCache<z.infer<typeof directorySchema>>(900000, 1);
  constructor(private http: HttpClient) {}
  async search(query: string, _languages: string[] = [], options: ProviderOptions = {}): Promise<Resource[]> {
    const { value } = await this.directory.resolve(directoryUrl,
      async () => directorySchema.parse(await this.http.json(directoryUrl, {}, 16_000_000)));
    const tokens = terms(query);
    return Object.entries(value).flatMap(([id, entry]) => {
      const checked = versionSchema.safeParse(entry.versions[entry.preferred]);
      if (!checked.success) return [];
      const row = checked.data; const tags = row.info['x-apisguru-categories'] ?? [];
      const title = row.info.title.toLowerCase();
      const description = (row.info.description ?? '').replace(/<[^>]*>/g, ' ');
      const strong = `${id} ${title} ${tags.join(' ')}`;
      const content = `${strong} ${description}`;
      const matches = tokens.filter(token => matchesTerm(content, token)).length;
      if (!matches) return [];
      const headline = tokens.filter(token => matchesTerm(strong, token)).length;
      const phrase = query.trim().toLowerCase();
      // Do not prefer long unrelated descriptions that incidentally contain
      // "fact" or "check"; exact function/name/category matches take precedence.
      if (!headline && !description.toLowerCase().includes(phrase)) return [];
      const matchScore = matches + headline * 5 + (title.includes(phrase) ? 10 : 0);
      const docs = row.externalDocs?.url;
      const url = docs && publicHttpsUrl(docs) ? docs : row.swaggerUrl;
      if (!publicHttpsUrl(url) || !publicHttpsUrl(row.swaggerUrl)) return [];
      const resource: Resource = {
        category: 'API', provider: this.name, externalId: id, name: row.info.title.slice(0, 300),
        description: (row.info.description ?? '').replace(/<[^>]*>/g, ' ').slice(0, 5000),
        url, sourceApiUrl: directoryUrl, sourceCreatedAt: dateOrNull(row.added),
        sourceUpdatedAt: dateOrNull(row.updated), retrievedAt: new Date(),
        license: null, language: null, tags: tags.slice(0, 100),
        qualitySignals: { ...unknownSignals(), documentation: Boolean(docs && publicHttpsUrl(docs)) },
        sourceMetadata: {
          apiProvider: row.info['x-providerName'] ?? id.split(':')[0],
          specificationUrl: row.swaggerUrl, documentationUrl: docs && publicHttpsUrl(docs) ? docs : null,
          specificationLicense: row.info.license ?? null, pricing: 'UNKNOWN',
          licenseNote: 'An API specification license is not the API service license or pricing.',
          directoryVersion: entry.preferred,
        },
      };
      return [{ resource, matches: matchScore }];
    }).sort((a, b) => b.matches - a.matches || a.resource.externalId.localeCompare(b.resource.externalId))
      .slice(0, options.limit ?? 5).map(item => item.resource);
  }
}
