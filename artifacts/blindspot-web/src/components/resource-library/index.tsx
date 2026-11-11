import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import {
  useListSavedResources, getListSavedResourcesQueryKey,
  type ListSavedResourcesParams, type ListSavedResourcesSort, type ResourceCategory, type SavedResourceListItem,
} from '@workspace/api-client-react';
import { EmptyState, ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { useFade, useStagger } from '@/components/discovery/motion';
import { CATEGORIES, CATEGORY_META, PROVIDER_META, fmtWhen } from '@/lib/resource-search';
import { RESOURCE_STATUSES } from '@/hooks/use-resource-saving';
import {
  LIBRARY_LIMIT, LIBRARY_PROVIDERS, STATUS_LABEL, clientActive, emptyClient, filterLoaded, fmtDay, groupItems, type ClientFilters,
} from '@/lib/resource-library';
import { ExternalLinkSafe, ResourceDetail, type Selected } from '@/components/resource-search/detail';
import { ResourceSaveControls } from './save-controls';

const field = 'min-h-10 w-full rounded-md border border-[#1F3D2B]/20 bg-[#FBF7EE] px-2.5 text-sm text-[#1F3D2B] focus:outline-none focus:ring-2 focus:ring-[#1F3D2B]/30';
const lbl = 'flex min-w-0 flex-col gap-1 font-mono text-[10px] uppercase tracking-wider text-[#1F3D2B]/60';
type GroupBy = 'none' | 'category' | 'provider';

export function ResourceLibrary({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [provider, setProvider] = useState('');
  const [sort, setSort] = useState<ListSavedResourcesSort>('relevance');
  const [cf, setCf] = useState<ClientFilters>(emptyClient);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [selected, setSelected] = useState<Selected | null>(null);
  const fade = useFade();
  const stagger = useStagger();

  const params: ListSavedResourcesParams = {
    page, limit: LIBRARY_LIMIT, sort,
    ...(category ? { category } : {}),
    ...(provider ? { provider } : {}),
  };
  const q = useListSavedResources(projectId, params, { query: { enabled: !!projectId, queryKey: getListSavedResourcesQueryKey(projectId, params) } });
  const items = useMemo(() => q.data?.data.items ?? [], [q.data]);
  const visible = useMemo(() => filterLoaded(items, cf), [items, cf]);
  const groups = useMemo(() => groupItems(visible, groupBy), [visible, groupBy]);
  const serverActive = !!category || !!provider;
  const local = clientActive(cf);
  const anyFilter = serverActive || local;
  const set = (k: keyof ClientFilters) => (v: string) => setCf((c) => ({ ...c, [k]: v }));
  const clear = () => { setCategory(''); setProvider(''); setCf(emptyClient()); setGroupBy('none'); setPage(1); };
  const open = (it: SavedResourceListItem) => setSelected({ resource: it.resource, saved: it.saved, rec: undefined, origin: 'project resource library' });
  let idx = 0;

  return (
    <div className="space-y-6 text-[#1F3D2B]" data-testid="resource-library">
      <motion.header {...fade} className="relative overflow-hidden rounded-lg bg-[#1F3D2B] p-5 text-[#E8DCC4] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border border-[#E8DCC4]/10" />
        <div aria-hidden className="pointer-events-none absolute -right-2 top-6 h-32 w-32 rounded-full border border-[#E8DCC4]/10" />
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#E8DCC4]/60">Project resource library</p>
        <h1 className="mt-1 font-display text-3xl leading-tight md:text-4xl">Building blocks you chose to keep</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#E8DCC4]/75">
          A save records that this project is <em>considering</em>, <em>trying</em> or has <em>integrated</em> a resource. It is not evidence that the resource works for you. Stars and downloads describe popularity, not validation.
        </p>
        <Link href={`/projects/${projectId}/resources`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#E8DCC4] px-4 text-sm font-medium text-[#1F3D2B] hover:bg-[#F6F0E2]" data-testid="link-resource-intelligence">
          <Search className="h-4 w-4" aria-hidden />Find more in Resource Intelligence
        </Link>
      </motion.header>

      <section aria-label="Library filters" className="rounded-lg border border-[#1F3D2B]/15 bg-[#E8DCC4]/55 p-4">
        <p className="eyebrow mb-2">Server filters, applied across the whole library</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={lbl}>Category
            <select value={category} onChange={(e) => { setCategory(e.target.value as ResourceCategory | ''); setPage(1); }} className={field} data-testid="library-category">
              <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
            </select>
          </label>
          <label className={lbl}>Provider
            <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className={field} data-testid="library-provider">
              <option value="">All providers</option>{LIBRARY_PROVIDERS.map((p) => <option key={p} value={p}>{PROVIDER_META[p].label}</option>)}
            </select>
          </label>
          <label className={lbl}>Order
            <select value={sort} onChange={(e) => { setSort(e.target.value as ListSavedResourcesSort); setPage(1); }} className={field} data-testid="library-sort">
              <option value="relevance">Backend relevance order</option><option value="lastUpdated">Source last updated</option>
            </select>
          </label>
        </div>
        <div className="mt-4 border-t border-dashed border-[#1F3D2B]/20 pt-3">
          <p className="eyebrow mb-2">Refine this page only ({items.length} loaded)</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className={`${lbl} lg:col-span-2`}>Text
              <input type="search" value={cf.text} onChange={(e) => set('text')(e.target.value)} placeholder="Name, description, tag" className={field} data-testid="library-search" />
            </label>
            <label className={lbl}>Language
              <input value={cf.language} onChange={(e) => set('language')(e.target.value)} placeholder="Exact, e.g. Python" className={field} data-testid="library-language" />
            </label>
            <label className={lbl}>Status
              <select value={cf.status} onChange={(e) => set('status')(e.target.value)} className={field} data-testid="library-status-filter">
                <option value="">Any status</option>{RESOURCE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className={lbl}>Saved from
              <input type="date" value={cf.from} onChange={(e) => set('from')(e.target.value)} className={field} data-testid="library-saved-from" />
            </label>
            <label className={lbl}>Saved through
              <input type="date" value={cf.through} onChange={(e) => set('through')(e.target.value)} className={field} data-testid="library-saved-through" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <label className={`${lbl} w-48`}>Group page by
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={field} data-testid="library-group-by">
                <option value="none">No grouping</option><option value="category">Category</option><option value="provider">Provider</option>
              </select>
            </label>
            {anyFilter && (
              <button type="button" onClick={clear} className="min-h-10 rounded-full border border-[#1F3D2B]/30 px-4 text-sm hover:bg-[#1F3D2B] hover:text-[#E8DCC4]" data-testid="library-clear-filters">Clear filters</button>
            )}
          </div>
        </div>
      </section>

      <p className="font-mono text-[11px] text-[#1F3D2B]/70" role="status" data-testid="library-scope">
        {q.isSuccess
          ? `Page ${page}: ${local ? `${visible.length} of ${items.length} loaded saves match the page-only filters` : `${items.length} saves loaded`}. Counts describe this page, not the project total.`
          : `Page ${page}, up to ${LIBRARY_LIMIT} saves per page.`}
      </p>

      {q.isLoading ? <RowsSkeleton rows={4} /> : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load the library" />
      ) : items.length === 0 ? (
        serverActive || page > 1 ? (
          <EmptyState mark="0" title={page > 1 ? 'No saves on this page' : 'No saves match these server filters'} body="Other saves may exist under different filters or earlier pages." action={<button type="button" onClick={clear} className="min-h-10 rounded-full bg-[#1F3D2B] px-4 text-sm text-[#E8DCC4]">Clear filters</button>} />
        ) : (
          <EmptyState mark="LIB" title="Nothing saved to this project yet" body={<>Search real providers in <Link href={`/projects/${projectId}/resources`} className="underline">Resource Intelligence</Link> and save the building blocks you want to evaluate. Saving is a decision to look closer, not proof of fit.</>} />
        )
      ) : visible.length === 0 ? (
        <EmptyState mark="PG" title="No loaded saves match the page-only filters" body="These filters only look at the saves on this page. Matches may exist on other pages." action={<button type="button" onClick={() => setCf(emptyClient())} className="min-h-10 rounded-full bg-[#1F3D2B] px-4 text-sm text-[#E8DCC4]">Clear page filters</button>} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key || 'all'} aria-label={g.key || 'Saved resources'}>
              {g.key && (
                <h2 className="mb-2 flex items-baseline gap-2 border-b border-[#1F3D2B]/15 pb-1 font-display text-xl break-words">
                  {groupBy === 'category' ? CATEGORY_META[g.key as ResourceCategory]?.label ?? g.key : g.key}
                  <span className="font-mono text-[10px] text-[#1F3D2B]/55">{g.items.length} on this page</span>
                </h2>
              )}
              <ul className="grid gap-3 lg:grid-cols-2">
                {g.items.map((it) => (
                  <motion.li key={it.saved.id} {...stagger(idx++)} className="min-w-0">
                    <LibraryCard projectId={projectId} item={it} onOpen={() => open(it)} />
                  </motion.li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {!q.isLoading && !q.isError && <Pager page={page} setPage={setPage} count={items.length} limit={LIBRARY_LIMIT} label="Library pagination" />}

      <ResourceDetail projectId={projectId} selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function num(v: unknown) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }

function LibraryCard({ projectId, item, onOpen }: { projectId: string; item: SavedResourceListItem; onOpen: () => void }) {
  const { resource: r, saved } = item;
  const pop = (['stars', 'forks', 'downloads', 'likes'] as const).map((k) => [k, num(r.qualitySignals[k])] as const).filter(([, v]) => v !== null);
  return (
    <article className="flex h-full min-w-0 flex-col rounded-md border border-[#1F3D2B]/15 bg-[#FBF7EE] p-4 transition-colors hover:border-[#1F3D2B]/40" data-testid={`library-card-${r.id}`}>
      <p className="mb-1 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">
        <span>{CATEGORY_META[r.category]?.label ?? r.category}</span><span aria-hidden>/</span><span className="break-all">{r.provider}</span>
      </p>
      <button type="button" onClick={onOpen} className="min-h-8 break-words text-left font-display text-xl leading-tight hover:underline" data-testid={`library-open-${r.id}`}>{r.name}</button>
      <p className="mt-1 line-clamp-3 break-words text-sm text-[#1F3D2B]/75">{r.description || 'No description reported by source.'}</p>
      <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-1 font-mono text-[10.5px] text-[#1F3D2B]/65 sm:grid-cols-3">
        <div className="min-w-0 break-words"><dt className="inline">License </dt><dd className="inline">{r.license ?? 'Unknown'}</dd></div>
        <div className="min-w-0 break-words"><dt className="inline">Lang </dt><dd className="inline">{r.language ?? 'Unknown'}</dd></div>
        <div className="min-w-0 break-words"><dt className="inline">Src updated </dt><dd className="inline">{r.sourceUpdatedAt ? fmtDay(r.sourceUpdatedAt) : 'Unknown'}</dd></div>
      </dl>
      <p className="mt-2 flex flex-wrap gap-3 font-mono text-[10.5px] text-[#1F3D2B]/70" aria-label="Source-reported popularity, not validation">
        {pop.length ? pop.map(([k, v]) => <span key={k}>{(v as number).toLocaleString()} {k}</span>) : <span className="italic">Popularity not reported by source</span>}
      </p>
      <p className="mt-1 font-mono text-[10px] text-[#1F3D2B]/55">Saved {fmtWhen(saved.createdAt)}{saved.updatedAt !== saved.createdAt ? ` / association updated ${fmtDay(saved.updatedAt)}` : ''}</p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[#1F3D2B]/10 pt-3">
        <ExternalLinkSafe url={r.url} testId={`link-resource-external-${r.id}`} />
        <ResourceSaveControls projectId={projectId} resource={r} knownSaved={saved} compact />
      </div>
    </article>
  );
}

export default ResourceLibrary;
