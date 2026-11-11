import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'wouter';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { useListAssumptions, getListAssumptionsQueryKey } from '@workspace/api-client-react';
import { ProjectFrame } from '@/components/project-frame';
import { EmptyState, ErrorPanel, Pager, RowsSkeleton } from '@/components/kit';
import { useLatest } from '@/lib/latest';
import { PAGE_SIZE } from '@/lib/api';
import { FeedbackSummaryPanel } from '@/components/discovery/feedback-summary';
import { SourceBrowser } from '@/components/evidence/source-browser';
import { EvidenceFiltersBar, EvidenceList } from '@/components/evidence/evidence-library';
import { EvidenceDetail } from '@/components/evidence/evidence-detail';
import { EvidenceRelationships } from '@/components/evidence/evidence-relationships';
import { EvidenceContradictions } from '@/components/evidence/evidence-contradictions';
import { buildRelationships, DEFAULT_FILTERS, filterEvidence, flattenEvidence, tally, type EvidenceFilters } from '@/lib/evidence';

export default function EvidencePage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ProjectFrame id={id}>{(p) => <Evidence projectId={p.id} />}</ProjectFrame>;
}

type Tab = 'library' | 'relationships' | 'insights';
const TABS: { v: Tab; label: string }[] = [
  { v: 'library', label: 'Library' },
  { v: 'relationships', label: 'Relationships' },
  { v: 'insights', label: 'Conflicts and summary' },
];

function Evidence({ projectId }: { projectId: string }) {
  const reducedMotion = useReducedMotion();
  const latest = useLatest(projectId);
  const analysisId = latest.analysis?.id ?? '';
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('library');
  const [f, setF] = useState<EvidenceFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => { setPage(1); setSelectedId(null); setF(DEFAULT_FILTERS); }, [analysisId]);

  const params = { page, limit: PAGE_SIZE };
  const q = useListAssumptions(analysisId, params, { query: { enabled: !!analysisId, queryKey: getListAssumptionsQueryKey(analysisId, params) } });
  const items = useMemo(() => q.data?.data.items ?? [], [q.data]);
  const total = q.data?.data.pagination.total;
  const records = useMemo(() => flattenEvidence(items), [items]);
  const byId = useMemo(() => new Map(items.map((a, i) => [a.id, { a, rank: (page - 1) * PAGE_SIZE + i + 1 }])), [items, page]);
  const origins = useMemo(() => Array.from(new Set(records.map((e) => e.origin))).sort(), [records]);
  const label = (aid: string) => byId.get(aid)?.a.description ?? `Hypothesis ${aid.slice(0, 8)}`;
  const visible = useMemo(() => filterEvidence(records, f, (aid) => byId.get(aid)?.a.description ?? ''), [records, f, byId]);
  const rels = useMemo(() => buildRelationships(items), [items]);
  const t = tally(records);
  const covered = rels.filter((r) => r.records.length > 0).length;
  // Always resolve from fresh query data so outcome mutations refresh the detail.
  const selected = selectedId ? records.find((e) => e.id === selectedId) : undefined;
  const selectedA = selected ? byId.get(selected.assumptionId) : undefined;
  const hasSelection = !!selected;
  useEffect(() => {
    if (!hasSelection || tab !== 'library' || window.innerWidth >= 1024) return;
    const panel = document.getElementById('evidence-detail-panel');
    panel?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    panel?.focus({ preventScroll: true });
  }, [hasSelection, selectedId, tab, reducedMotion]);

  const selectEvidence = (eid: string) => { setF(DEFAULT_FILTERS); setSelectedId(eid); setTab('library'); };
  const changePage = (p: number) => { setPage(p); setSelectedId(null); setF(DEFAULT_FILTERS); };

  return (
    <div className="space-y-6" data-testid="evidence-workspace">
      <header className="space-y-3">
        <p className="eyebrow text-[#1F3D2B]">Evidence intelligence</p>
        <h2 className="max-w-3xl font-display text-2xl leading-tight text-[#1F3D2B] md:text-3xl">What your customers said, kept apart from what you assumed and what the model suggested.</h2>
        <p className="text-xs text-muted-foreground">Verification status and citation-review history are not exposed by this API. Counts describe loaded links and sentiment, not verified findings.</p>
        {analysisId && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-[#1F3D2B] px-3 py-2 font-mono text-[11px] text-[#E8DCC4]" data-testid="evidence-scope">
            <span>Latest analysis v{latest.analysis?.version} / hypotheses page {page}{total !== undefined ? ` of ${Math.max(1, Math.ceil(total / PAGE_SIZE))} (${total} hypotheses total)` : ''}</span>
            <span>{records.length} records loaded</span>
            <span>{t.supporting} supporting / {t.challenging} challenging / {t.neutral} neutral</span>
            <span>{covered} of {items.length} loaded hypotheses have evidence</span>
          </p>
        )}
      </header>

      {latest.missing ? (
        <EmptyState mark="v0" title="No analysis yet" body="Evidence attaches to hypotheses. Run an analysis from Overview first." />
      ) : latest.failed ? (
        <ErrorPanel error={latest.q.error} onRetry={() => latest.q.refetch()} />
      ) : latest.q.isLoading ? (
        <RowsSkeleton rows={4} />
      ) : (
        <>
          <div role="tablist" aria-label="Evidence views" className="flex gap-1 overflow-x-auto border-b border-[#1F3D2B]/15">
            {TABS.map((x) => (
              <button key={x.v} role="tab" aria-selected={tab === x.v} onClick={() => setTab(x.v)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${tab === x.v ? 'border-[#1F3D2B] text-[#1F3D2B]' : 'border-transparent text-[#1F3D2B]/60 hover:text-[#1F3D2B]'}`} data-testid={`evidence-tab-${x.v}`}>
                {x.label}
              </button>
            ))}
          </div>

          {q.isLoading ? <RowsSkeleton rows={4} /> : q.isError ? (
            <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load hypotheses and evidence" />
          ) : tab === 'library' ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-3">
                <EvidenceFiltersBar f={f} setF={(next) => { setF(next); setSelectedId(null); }} origins={origins} assumptions={items} />
                <p className="font-mono text-[11px] text-[#1F3D2B]/65" data-testid="evidence-result-count">Showing {visible.length} of {records.length} records from this page of hypotheses</p>
                {records.length === 0 ? (
                  <EmptyState mark="0" title="No evidence on this page" body="Record interview notes in Customer Discovery, then analyze feedback or link notes to hypotheses." />
                ) : visible.length === 0 ? (
                  <EmptyState mark="--" title="Nothing matches" body={<button type="button" className="text-[#1F3D2B] underline" onClick={() => setF(DEFAULT_FILTERS)}>Reset filters</button>} />
                ) : (
                  <EvidenceList records={visible} selectedId={selectedId} onSelect={setSelectedId} label={label} />
                )}
              </div>
              <div id="evidence-detail-panel" tabIndex={-1} aria-label="Selected evidence detail" className="min-w-0 scroll-mt-20 lg:sticky lg:top-14 lg:self-start">
                <AnimatePresence mode="wait">
                  {selected ? (
                    <EvidenceDetail key={selected.id} e={selected} assumption={selectedA?.a} rank={selectedA?.rank ?? 0} projectId={projectId} onOpenSource={setSource} onClose={() => setSelectedId(null)} />
                  ) : (
                    <p className="rounded-md border border-dashed border-[#1F3D2B]/25 p-6 text-center text-sm text-[#1F3D2B]/65">Select a record to read the full quote, its exact references and the outcome actions for its hypothesis.</p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : tab === 'relationships' ? (
            items.length === 0 ? <EmptyState mark="0" title="No hypotheses on this page" body="Try another page." /> : <EvidenceRelationships rels={rels} selectedEvidenceId={selectedId} onSelectEvidence={selectEvidence} />
          ) : (
            <div className="space-y-8">
              <EvidenceContradictions projectId={projectId} records={records} assumptions={items} onOpenSource={setSource} onSelectEvidence={selectEvidence} />
              <FeedbackSummaryPanel projectId={projectId} assumptions={latest.analysis?.assumptions ?? []} latestMissing={latest.missing} latestAnalysisId={latest.analysis?.id} showContradictions={false} />
            </div>
          )}
          {tab !== 'insights' && <Pager page={page} setPage={changePage} count={items.length} limit={PAGE_SIZE} label="Evidence hypotheses pagination" />}
        </>
      )}
      {source && <SourceBrowser projectId={projectId} feedbackId={source} onClose={() => setSource(null)} />}
    </div>
  );
}
