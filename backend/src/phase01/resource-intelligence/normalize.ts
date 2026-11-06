import { resourceSchema, type Resource } from './types.js';

const hosts: Record<string, string[]> = {
  github: ['github.com'], huggingface: ['huggingface.co'], kaggle: ['www.kaggle.com'],
  uci: ['archive.ics.uci.edu'],
  technical: ['developer.mozilla.org', 'docs.github.com', 'huggingface.co', 'scikit-learn.org', 'pytorch.org'],
};
export function normalizeResource(value: unknown): Resource | null {
  const parsed = resourceSchema.safeParse(value);
  if (!parsed.success) return null;
  const resource = parsed.data;
  const url = new URL(resource.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || !hosts[resource.provider]?.includes(url.hostname)) return null;
  if (resource.provider === 'github' && !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) return null;
  if (resource.provider === 'huggingface' && !/^\/(?:datasets\/)?[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) return null;
  if (resource.provider === 'kaggle' && !/^\/datasets\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) return null;
  if (resource.provider === 'uci' && !/^\/dataset\/\d+(\/[\w.-]+)?\/?$/.test(url.pathname)) return null;
  url.hash = ''; url.search = '';
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\.git$/, '');
  if (resource.provider === 'github') url.pathname = url.pathname.toLowerCase();
  return { ...resource, url: url.toString().replace(/\/$/, ''), description: resource.description.slice(0, 5000) };
}
export function deduplicate(values: unknown[]): Resource[] {
  const resources = new Map<string, Resource>();
  for (const value of values) {
    const resource = normalizeResource(value);
    if (resource && !resources.has(resource.url)) resources.set(resource.url, resource);
  }
  return [...resources.values()];
}
