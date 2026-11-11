import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useListResources,
  getListResourcesQueryKey,
  type ListResourcesParams,
  type ListResourcesSort,
  type ResourceCategory,
  type ResourceListItem,
} from '@workspace/api-client-react';
import { EmptyState, ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { useStagger } from '@/components/discovery/motion';
import { CATEGORIES, CATEGORY_META, PROVIDERS, PROVIDER_META, fmtWhen } from '@/lib/resource-search';
import { AiTag, ExternalLinkSafe, ScoreBar, type Selected } from './detail';

const LIMIT = 20;
const sel = 'min-h-10 rounded-md border border-[#1F3D2B]/20 bg-[#FBF7EE] px-2 text-xs';

export function Collection({ projectId, onOpen }: { projectId: string; onOpen: (s: Selected) => void }) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [provider, setProvider] = useState('');
  const [sort, setSort] = useState<ListResourcesSort>('relevance');
  const [minInput, setMinInput] = useState('');
  const [minRelevance, setMinRelevance] = useState<number | undefined>();
  const minInvalid = minInput.trim() !== '' && (!Number.isFinite(Number(minInput)) || Number(minInput) < 0 || Number(minInput) > 100);
  const stagger = useStagger();

  const params: ListResourcesParams = {
    page, limit: LIMIT, sort,
    ...(category ? { category } : {}),
    ...(provider ? { provider } : {}),
    ...(minRelevance !== undefined ? { minRelevance } : {}),
  };
  const q = useListResources(projectId, params, { query: { enabled: !!projectId, queryKey: getListResourcesQueryKey(projectId, params) } });
  const items = q.data?.data.items ?? [];

  const commitMin = () => {
    const t = minInput.trim();
    if (!t) { setMinRelevance(undefined); setPage(1); return; }
    const n = Number(t);
    if (Number.isFinite(n) && n >= 0 && n <= 100) { setMinRelevance(n); setPage(1); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Category
          <select value={category} onChange={(e) => { setCategory(e.target.value as ResourceCategory | ''); setPage(1); }} className={sel} data-testid="resource-filter-category">
            <option value="">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Provider
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className={sel} data-testid="resource-filter-provider">
            <option value="">All</option>{PROVIDERS.filter((p) => p !== 'huggingface').map((p) => <option key={p} value={p}>{PROVIDER_META[p].label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Sort
          <select value={sort} onChange={(e) => { setSort(e.target.value as ListResourcesSort); setPage(1); }} className={sel} data-testid="resource-sort">
            <option value="relevance">Backend rank</option><option value="lastUpdated">Source last updated</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Min relevance 0-100
          <input type="number" inputMode="numeric" min={0} max={100} value={minInput} aria-invalid={minInvalid} aria-describedby={minInvalid ? 'resource-min-error' : undefined} onChange={(e) => setMinInput(e.target.value)} onBlur={commitMin} onKeyDown={(e) => { if (e.key === 'Enter') commitMin(); }} className={`${sel} w-24`} data-testid="resource-min-relevance" />
        </label>
      </div>
      {minInvalid && <p id="resource-min-error" role="alert" className="mb-3 text-xs text-destructive">Enter relevance between 0 and 100. The last valid filter still applies.</p>}
      {q.isLoading ? <RowsSkeleton rows={4} /> : q.isError ? (
        <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load collection" />
      ) : items.length === 0 ? (
        <EmptyState mark="SRC" title="Nothing in this collection view" body="Run a search above, or loosen the filters. An empty result is not proof that nothing suitable exists." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((it, i) => (
            <motion.li key={`${it.resource.id}-${it.recommendation?.id ?? i}`} {...stagger(i)} className="min-w-0">
              <Card item={it} position={(page - 1) * LIMIT + i + 1} onOpen={onOpen} />
            </motion.li>
          ))}
        </ul>
      )}
      <Pager page={page} setPage={setPage} count={items.length} limit={LIMIT} label="Collection pagination" />
    </div>
  );
}

function Card({ item, position, onOpen }: { item: ResourceListItem; position: number; onOpen: (s: Selected) => void }) {
  const { resource: r, recommendation: rec } = item;
  const open = () => onOpen({ resource: r, rec, origin: 'latest completed search collection' });
  return (
    <article className="flex h-full flex-col rounded-md border border-[#1F3D2B]/12 bg-[#FBF7EE] p-3.5 transition-colors hover:border-[#1F3D2B]/35" data-testid={`resource-card-${r.id}`}>
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-[#1F3D2B]/45">{String(position).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">
            <span>{CATEGORY_META[r.category]?.label ?? r.category}</span><span>/</span><span className="break-all">{r.provider}</span>
          </p>
          <button type="button" onClick={open} className="min-h-8 break-words text-left font-display text-lg leading-tight text-[#1F3D2B] hover:underline" data-testid={`button-open-resource-${r.id}`}>{r.name}</button>
          <p className="mt-1 line-clamp-3 break-words text-xs text-[#1F3D2B]/70">{r.description || 'No description reported by source.'}</p>
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-0.5 font-mono text-[10px] text-[#1F3D2B]/60 sm:grid-cols-3">
        <div className="min-w-0 break-words"><dt className="inline">License </dt><dd className="inline">{r.license ?? 'Unknown'}</dd></div>
        <div className="min-w-0 break-words"><dt className="inline">Lang </dt><dd className="inline">{r.language ?? 'Unknown'}</dd></div>
        <div className="min-w-0 break-words"><dt className="inline">Updated </dt><dd className="inline">{r.sourceUpdatedAt ? fmtWhen(r.sourceUpdatedAt).split(',')[0] : 'Unknown'}</dd></div>
      </dl>
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-[#1F3D2B]/70" aria-label="Source-reported popularity">
        {(['stars', 'forks', 'downloads', 'likes'] as const).map((key) => {
          const value = r.qualitySignals[key];
          return typeof value === 'number' && Number.isFinite(value)
            ? <span key={key}>{value.toLocaleString()} {key}</span> : null;
        })}
        {typeof r.qualitySignals.documentation === 'boolean' && <span>Documentation reported: {r.qualitySignals.documentation ? 'yes' : 'no'}</span>}
      </div>
      {rec ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <ScoreBar label="Rank" v={rec.rankScore} strong /><ScoreBar label="Rel" v={rec.relevanceScore} /><ScoreBar label="Qual" v={rec.qualityScore} />
          {rec.explanation && <span className="ml-auto"><AiTag /></span>}
        </div>
      ) : <p className="mt-2 text-[11px] italic text-[#1F3D2B]/55">No ranking snapshot for this item.</p>}
      <div className="mt-auto pt-3"><ExternalLinkSafe url={r.url} testId={`link-resource-external-${r.id}`} /></div>
    </article>
  );
}
