import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'wouter';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Search, FlaskConical } from 'lucide-react';
import { useListExperiments, getListExperimentsQueryKey, type Experiment } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { ProjectFrame } from '@/components/project-frame';
import { EmptyState, ErrorPanel, InlineError, Pager, RowsSkeleton } from '@/components/kit';
import { PAGE_SIZE } from '@/lib/api';
import { useLatest } from '@/lib/latest';
import { SORTS, STATUSES, STATUS_LABEL, filterSort, type SortKey } from '@/lib/experiments';
import { useFade } from '@/components/discovery/motion';
import { ExperimentCard } from '@/components/experiments/card';
import { ExperimentDetail } from '@/components/experiments/detail';
import { CreateExperimentDialog } from '@/components/experiments/create-dialog';
import { field, forestBtn, wrap } from '@/components/experiments/ui';

export default function ExperimentsPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <Experiments projectId={p.id} />}</ProjectFrame>;
}

function Experiments({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [assumption, setAssumption] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<Experiment | null>(null);
  const fade = useFade();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!selectedId || window.innerWidth >= 1024) return;
    const detail = document.getElementById('experiment-detail-panel');
    detail?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
    detail?.focus({ preventScroll: true });
  }, [selectedId, reducedMotion]);

  const params = { page, limit: PAGE_SIZE };
  const list = useListExperiments(projectId, params, { query: { enabled: !!projectId, queryKey: getListExperimentsQueryKey(projectId, params) } });
  const latest = useLatest(projectId);
  const items = useMemo(() => list.data?.data.items ?? [], [list.data]);
  const assumptions = useMemo(() => latest.analysis?.assumptions ?? [], [latest.analysis]);
  const byId = useMemo(() => new Map(assumptions.map((a) => [a.id, a])), [assumptions]);
  const describe = (aid: string) => { const a = byId.get(aid); return a ? a.title || a.description : undefined; };

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, items.filter((e) => e.status === s).length])), [items]);
  const assumptionIds = useMemo(() => [...new Set(items.map((e) => e.assumptionId))], [items]);
  const shown = filterSort(items, { q, status, assumption, sort }, describe);
  const filtered = !!(q || status || assumption);

  // Detail resolves from the fresh list query; fall back to the just-created server record until it appears.
  const selected = (selectedId && items.find((e) => e.id === selectedId)) || (justCreated && justCreated.id === selectedId ? justCreated : null) || shown[0] || null;

  const onCreated = (e: Experiment) => {
    setQ(''); setStatus(''); setAssumption(''); setSort('updated'); setPage(1);
    setJustCreated(e); setSelectedId(e.id);
  };
  const canCreate = !!latest.analysis && assumptions.length > 0;

  return (
    <div className="min-w-0 space-y-6" data-testid="experiments-workspace">
      <motion.header {...fade} className="relative overflow-hidden rounded-2xl bg-[#1F3D2B] p-6 text-[#E8DCC4] sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-[#E8DCC4]/15" />
        <div aria-hidden className="pointer-events-none absolute -right-4 top-10 h-32 w-32 rounded-full border border-[#8B5CF6]/40" />
        <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[#E8DCC4]/70">Falsification / Experiments</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">Small tests that could prove you wrong.</h1>
            <p className="mt-2 text-sm text-[#E8DCC4]/75">Finishing an experiment records what customers actually did. It is not proof, and it never changes an assumption's status.</p>
          </div>
          <Button onClick={() => setCreating(true)} disabled={!canCreate} className="min-h-11 bg-[#E8DCC4] text-[#1F3D2B] hover:bg-[#E8DCC4]/90" data-testid="button-new-experiment">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />New experiment
          </Button>
        </div>
      </motion.header>

      {latest.missing && <EmptyState mark="v0" title="Nothing to test yet" body={<>Experiments target an assumption from an analysis. <Link href={`/projects/${projectId}`} className="text-[#1F3D2B] underline">Run an analysis first.</Link></>} />}
      {latest.failed && (
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Latest analysis unavailable: new experiments are paused and assumption context is hidden. Existing experiments still load below.</p><InlineError error={latest.q.error} /></div>
      )}

      {list.isLoading ? (
        <RowsSkeleton rows={5} />
      ) : list.isError ? (
        <ErrorPanel error={list.error} onRetry={() => list.refetch()} title="Could not load experiments" />
      ) : items.length === 0 && page === 1 && !justCreated ? (
        !latest.missing && <EmptyState mark="EXP" title="No experiments yet" body="Pick the riskiest assumption and design the cheapest test that could prove it wrong." action={<Button onClick={() => setCreating(true)} disabled={!canCreate} className={forestBtn}>Design an experiment</Button>} />
      ) : (
        <>
          <section aria-label="Loaded page status counts" data-testid="experiments-scope" className="rounded-xl border border-[#1F3D2B]/12 bg-[#E8DCC4]/45 p-4">
            <p className="eyebrow">Page {page} only / {items.length} loaded {items.length === 1 ? 'record' : 'records'} / not project totals</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(status === s ? '' : s)} aria-pressed={status === s} data-testid={`count-${s}`}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-left transition-colors ${status === s ? 'border-[#1F3D2B] bg-[#1F3D2B] text-[#E8DCC4]' : 'border-[#1F3D2B]/15 bg-[#FBF8F1] text-[#1F3D2B] hover:border-[#1F3D2B]/40'}`}>
                  <span className="block font-display text-2xl leading-none">{counts[s]}</span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider opacity-75">{STATUS_LABEL[s]}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <label className="relative min-w-0">
              <span className="sr-only">Search loaded experiments</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F3D2B]/50" aria-hidden />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this page" className={`${field} min-h-11 pl-8`} data-testid="experiment-search" />
            </label>
            <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} min-h-11`} data-testid="experiment-status-filter">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select aria-label="Filter by assumption" value={assumption} onChange={(e) => setAssumption(e.target.value)} className={`${field} min-h-11`} data-testid="experiment-assumption-filter">
              <option value="">All assumptions</option>
              {assumptionIds.map((a) => <option key={a} value={a}>{(describe(a) ?? `Ref ${a}`).slice(0, 80)}</option>)}
            </select>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${field} min-h-11`} data-testid="experiment-sort">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="min-w-0">
              {shown.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#1F3D2B]/25 p-6 text-center text-sm text-muted-foreground">
                  <FlaskConical className="mx-auto mb-2 h-5 w-5 text-[#1F3D2B]/50" aria-hidden />
                  {filtered ? 'No loaded experiments match these filters.' : 'No experiments on this page.'}
                  {filtered && <button type="button" className="mt-2 block w-full text-xs text-[#1F3D2B] underline" onClick={() => { setQ(''); setStatus(''); setAssumption(''); }} data-testid="button-clear-filters">Clear filters</button>}
                </div>
              ) : (
                <ul className="space-y-2" aria-label="Experiments">
                  {shown.map((e, i) => <ExperimentCard key={e.id} e={e} i={i} selected={selected?.id === e.id} hypothesis={describe(e.assumptionId)} onSelect={() => setSelectedId(e.id)} />)}
                </ul>
              )}
              <Pager page={page} setPage={(p) => { setPage(p); setSelectedId(null); setQ(''); setStatus(''); setAssumption(''); }} count={items.length} limit={PAGE_SIZE} label="Experiments pagination" />
            </div>
            <div id="experiment-detail-panel" tabIndex={-1} aria-label="Selected experiment detail" className="min-w-0 scroll-mt-20 lg:sticky lg:top-4 lg:self-start">
              <AnimatePresence mode="wait">
                {selected ? (
                  <motion.div key={selected.id} {...fade}>
                    {justCreated?.id === selected.id && !items.some((e) => e.id === selected.id) && (
                      <p className={`mb-2 text-[11px] text-muted-foreground ${wrap}`}>Saved. Showing the returned record; it may sit on another page of the list.</p>
                    )}
                    <ExperimentDetail projectId={projectId} e={selected} assumption={byId.get(selected.assumptionId)} latestFailed={latest.failed} onUpdated={(record) => setJustCreated((old) => old?.id === record.id ? record : old)} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {latest.analysis && (
        <CreateExperimentDialog projectId={projectId} assumptions={assumptions} open={creating} onOpenChange={setCreating} onCreated={onCreated} />
      )}
    </div>
  );
}
