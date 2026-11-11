import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  useListResources, getListResourcesQueryKey, useListResourceSearches, getListResourceSearchesQueryKey,
  useGetLatestAnalysis, getGetLatestAnalysisQueryKey,
  type ListResourcesParams, type ListResourcesSort, type Project, type ResourceCategory,
} from '@workspace/api-client-react';
import { EmptyState, ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { useStagger } from '@/components/discovery/motion';
import { ResourceDetail, type Selected } from '@/components/resource-search/detail';
import { useResourceSession } from '@/hooks/use-resource-search';
import { CATEGORIES, CATEGORY_META, PROVIDERS, PROVIDER_META } from '@/lib/resource-search';
import { readError } from '@/lib/api';
import { GenerateForm } from './generate-form';
import { RecommendationCard } from './card';
import { RecommendationReason } from './reason';
import { ContextPanel, ProvenancePanel, matchProvenance, toAnalysisState } from './context';

const LIMIT = 20;
const HISTORY_PARAMS = { page: 1, limit: 20 };
const sel = 'min-h-10 rounded-md border border-[#1F3D2B]/20 bg-[#FBF7EE] px-2 text-xs text-[#1F3D2B]';

export function RecommendationWorkspace({ project }: { project: Project }) {
  const projectId = project.id;
  const session = useResourceSession(projectId);
  const stagger = useStagger();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [provider, setProvider] = useState('');
  const [sort, setSort] = useState<ListResourcesSort>('relevance');
  const [minInput, setMinInput] = useState('');
  const [minRelevance, setMinRelevance] = useState<number | undefined>();
  const [selected, setSelected] = useState<Selected | null>(null);

  const params: ListResourcesParams = {
    page, limit: LIMIT, sort,
    ...(category ? { category } : {}), ...(provider ? { provider } : {}),
    ...(minRelevance !== undefined ? { minRelevance } : {}),
  };
  const list = useListResources(projectId, params, { query: { enabled: !!projectId, queryKey: getListResourcesQueryKey(projectId, params) } });
  const hist = useListResourceSearches(projectId, HISTORY_PARAMS, { query: { enabled: !!projectId, queryKey: getListResourceSearchesQueryKey(projectId, HISTORY_PARAMS) } });
  const an = useGetLatestAnalysis(projectId, { query: { enabled: !!projectId, queryKey: getGetLatestAnalysisQueryKey(projectId) } });
  const analysis = toAnalysisState(an);

  const items = list.data?.data.items ?? [];
  const searchIds = Array.from(new Set(items.map((i) => i.recommendation?.searchId).filter((x): x is string => !!x)));
  const last = session.run.last;
  useEffect(() => {
    if (!last?.searchId) return;
    setPage(1); setCategory(''); setProvider(''); setSort('relevance');
    setMinInput(''); setMinRelevance(undefined); setSelected(null);
  }, [last?.searchId]);
  const prov = matchProvenance(searchIds[0] ?? null, hist.data?.data.items, last, hist.isLoading, hist.isError ? readError(hist.error).message : null);

  const minInvalid = minInput.trim() !== '' && (!Number.isFinite(Number(minInput)) || Number(minInput) < 0 || Number(minInput) > 100);
  const commitMin = () => {
    const t = minInput.trim();
    if (!t) { setMinRelevance(undefined); setPage(1); return; }
    const n = Number(t);
    if (Number.isFinite(n) && n >= 0 && n <= 100) { setMinRelevance(n); setPage(1); }
  };
  const filtered = !!category || !!provider || minRelevance !== undefined || sort !== 'relevance';
  const clear = () => { setCategory(''); setProvider(''); setSort('relevance'); setMinInput(''); setMinRelevance(undefined); setPage(1); };

  return (
    <div className="space-y-8" data-testid="recommendations-workspace">
      <header className="rise">
        <p className="eyebrow">Technical building blocks</p>
        <h2 className="mt-1 font-display text-3xl leading-tight text-[#1F3D2B] md:text-4xl">Recommendations for {project.name}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#1F3D2B]/70">
          Real technical resources from this project's latest completed search. Stored context is shown below; generation uses current server-side project data. Relevance is a heuristic, not verified product fit, security, software quality or market validation.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <Link href={`/projects/${projectId}/resources`} className="underline underline-offset-4" data-testid="link-recommendation-search">Manual resource search</Link>
          <Link href={`/projects/${projectId}/library`} className="underline underline-offset-4" data-testid="link-recommendation-library">Project library</Link>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-[#1F3D2B]/15 bg-[#FBF7EE] p-5">
          <p className="eyebrow mb-3">Generate from project context</p>
          <GenerateForm projectId={projectId} />
        </section>
        <ContextPanel projectId={projectId} analysis={analysis} />
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Latest completed search</p>
            <h3 className="font-display text-2xl text-[#1F3D2B]">Recommended building blocks</h3>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Category
              <select value={category} onChange={(e) => { setCategory(e.target.value as ResourceCategory | ''); setPage(1); }} className={sel} data-testid="recommendations-category">
                <option value="">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Provider
              <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className={sel} data-testid="recommendations-provider">
                <option value="">All</option>{PROVIDERS.filter((p) => p !== 'huggingface').map((p) => <option key={p} value={p}>{PROVIDER_META[p].label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Order
              <select value={sort} onChange={(e) => { setSort(e.target.value as ListResourcesSort); setPage(1); }} className={sel} data-testid="recommendations-sort">
                <option value="relevance">Server rank</option><option value="lastUpdated">Snapshot source date</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-[#1F3D2B]/60">Min relevance
              <input type="number" inputMode="numeric" min={0} max={100} value={minInput} aria-invalid={minInvalid} onChange={(e) => setMinInput(e.target.value)} onBlur={commitMin} onKeyDown={(e) => { if (e.key === 'Enter') commitMin(); }} className={`${sel} w-24`} data-testid="recommendations-min-relevance" />
            </label>
            <button type="button" disabled={!filtered && !minInput} onClick={clear} className="min-h-10 rounded-md px-3 text-xs text-[#1F3D2B] underline-offset-4 hover:underline disabled:opacity-40" data-testid="recommendations-clear-filters">Clear filters</button>
          </div>
        </div>
        {minInvalid && <p role="alert" className="mb-3 text-xs text-destructive">Enter relevance between 0 and 100. The last valid filter still applies.</p>}

        {!list.isLoading && !list.isError && items.length > 0 && <div className="mb-4"><ProvenancePanel prov={prov} analysis={analysis} mixed={searchIds.length > 1} /></div>}

        {list.isLoading ? <RowsSkeleton rows={4} /> : list.isError ? (
          <ErrorPanel error={list.error} onRetry={() => list.refetch()} title="Could not load recommendations" />
        ) : items.length === 0 ? (
          <EmptyState mark="REC" title={filtered ? 'Nothing matches these filters' : 'No recommendations yet'} body={filtered ? 'Filters apply on the server to the latest completed search. Clear them to see the full list.' : 'Generate from project context above. An empty list is not proof that nothing suitable exists.'} />
        ) : (
          <>
            <p className="mb-3 font-mono text-[10px] text-[#1F3D2B]/55">{items.length} on this page, in the order the server returned. Resources here are search-time snapshots.</p>
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((it, i) => (
                <motion.li key={`${it.resource.id}-${it.recommendation?.id ?? i}`} {...stagger(i)} className="min-w-0">
                  <RecommendationCard projectId={projectId} item={it} position={(page - 1) * LIMIT + i + 1}
                    onOpen={() => setSelected({ resource: it.resource, rec: it.recommendation, saved: it.saved, origin: 'recommended resources, latest completed search' })} />
                </motion.li>
              ))}
            </ul>
          </>
        )}
        <Pager page={page} setPage={setPage} count={items.length} limit={LIMIT} label="Recommendations pagination" />
      </section>

      <ResourceDetail selected={selected} onClose={() => setSelected(null)} projectId={projectId}
        rankingContent={selected?.rec ? <RecommendationReason rec={selected.rec} rid={`detail-${selected.resource.id}`} /> : undefined} />
    </div>
  );
}
