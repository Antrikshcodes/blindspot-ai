import type { ResourceSaveInputStatus, SavedResourceListItem } from '@workspace/api-client-react';
import { PROVIDERS } from '@/lib/resource-search';

export const LIBRARY_LIMIT = 20;
/** Exact provider codes accepted by the saved-list GET; the composite 'huggingface' is excluded. */
export const LIBRARY_PROVIDERS = PROVIDERS.filter((p) => p !== 'huggingface');

export const STATUS_LABEL: Record<ResourceSaveInputStatus, string> = {
  CONSIDERING: 'Considering',
  TRYING: 'Trying',
  INTEGRATED: 'Integrated',
};

export const fmtDay = (s?: string | null) => {
  if (!s) return 'Unknown';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export type ClientFilters = { text: string; language: string; status: string; from: string; through: string };
export const emptyClient = (): ClientFilters => ({ text: '', language: '', status: '', from: '', through: '' });
export const clientActive = (f: ClientFilters) => Object.values(f).some((v) => v.trim() !== '');

/** Filters only the currently loaded page. Never used to infer project totals. */
export function filterLoaded(items: SavedResourceListItem[], f: ClientFilters) {
  const t = f.text.trim().toLowerCase();
  const lang = f.language.trim().toLowerCase();
  const from = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
  const through = f.through ? new Date(`${f.through}T23:59:59.999`).getTime() : null;
  return items.filter(({ resource: r, saved }) => {
    if (t && !`${r.name} ${r.description} ${r.tags.join(' ')}`.toLowerCase().includes(t)) return false;
    if (lang && (r.language ?? '').toLowerCase() !== lang) return false;
    if (f.status && saved.status !== f.status) return false;
    const at = new Date(saved.createdAt).getTime();
    if (from !== null && !(at >= from)) return false;
    if (through !== null && !(at <= through)) return false;
    return true;
  });
}

export function groupItems(items: SavedResourceListItem[], by: 'none' | 'category' | 'provider') {
  if (by === 'none') return [{ key: '', items }];
  const map = new Map<string, SavedResourceListItem[]>();
  for (const it of items) {
    const k = by === 'category' ? it.resource.category : it.resource.provider;
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return [...map.entries()].map(([key, items]) => ({ key, items }));
}
