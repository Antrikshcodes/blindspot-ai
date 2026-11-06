import { resourceSchema, type Resource } from './types.js';
import { isIP } from 'node:net';

const hosts: Record<string, string[]> = {
  github: ['github.com'], huggingface: ['huggingface.co'], kaggle: ['www.kaggle.com'],
  uci: ['archive.ics.uci.edu'],
  apis_guru: [],
  technical: ['developer.mozilla.org', 'docs.github.com', 'huggingface.co', 'scikit-learn.org', 'pytorch.org'],
};
export function publicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value); const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && host.includes('.') && !isIP(host.replace(/^\[|\]$/g, ''))
      && !/(?:^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)
      && !host.endsWith('.localdomain') && !/[\u0000-\u0020]/.test(value);
  } catch { return false; }
}
export function normalizeResource(value: unknown): Resource | null {
  const parsed = resourceSchema.safeParse(value);
  if (!parsed.success) return null;
  const resource = parsed.data;
  const url = new URL(resource.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || (resource.provider === 'apis_guru' ? !publicHttpsUrl(resource.url)
      : !hosts[resource.provider]?.includes(url.hostname))) return null;
  const sourceHosts: Record<string, string> = {
    github: 'api.github.com', huggingface: 'huggingface.co', kaggle: 'www.kaggle.com',
    uci: 'archive.ics.uci.edu', apis_guru: 'api.apis.guru',
  };
  if (resource.sourceApiUrl) {
    const source = new URL(resource.sourceApiUrl);
    if (!publicHttpsUrl(resource.sourceApiUrl)
      || (resource.provider !== 'technical' && source.hostname !== sourceHosts[resource.provider])
      || (resource.provider === 'technical' && !hosts.technical.includes(source.hostname))) return null;
  }
  if (resource.provider === 'github' && !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) return null;
  if (resource.provider === 'huggingface' && !/^\/(?:datasets\/)?[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) return null;
  if (resource.provider === 'kaggle' && !/^\/datasets\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) return null;
  if (resource.provider === 'uci' && !/^\/dataset\/\d+(\/[\w.-]+)?\/?$/.test(url.pathname)) return null;
  url.hash = ''; url.search = '';
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\.git$/, '');
  if (resource.provider === 'github') url.pathname = url.pathname.toLowerCase();
  return { ...resource, url: url.toString().replace(/\/$/, ''), description: resource.description.slice(0, 5000),
    sourceMetadata: { ...resource.sourceMetadata, metadataAvailability: {
      description: resource.description ? 'RETURNED' : 'UNKNOWN',
      license: resource.license ? 'RETURNED' : 'UNKNOWN',
      maintenance: resource.sourceUpdatedAt ? 'RETURNED' : 'UNKNOWN',
      pricing: 'UNKNOWN',
    } } };
}
export function deduplicate(values: unknown[]): Resource[] {
  const resources = new Map<string, Resource>();
  const identities = new Set<string>();
  for (const value of values) {
    const resource = normalizeResource(value);
    const identity = resource ? `${resource.provider}:${resource.provider === 'github'
      ? resource.externalId.toLowerCase() : resource.externalId}` : '';
    if (resource && !resources.has(resource.url) && !identities.has(identity)) {
      resources.set(resource.url, resource); identities.add(identity);
    }
  }
  return [...resources.values()];
}
