import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useFade } from '@/components/discovery/motion';
import { cn } from '@/lib/utils';
import { fmtWhen } from '@/lib/resource-search';
import { useResourceSession, useRunResourceSearch } from '@/hooks/use-resource-search';
import { SearchForm } from './form';
import { ProviderStrip } from './providers';
import { Collection } from './collection';
import { History } from './history';
import { ResourceDetail, type Selected } from './detail';

export function ResourceWorkspace({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<'results' | 'history'>('results');
  const [selected, setSelected] = useState<Selected | null>(null);
  const { run, setDraft, setNotice } = useResourceSession(projectId);
  const { busy } = useRunResourceSearch(projectId);
  const fade = useFade();
  const reduced = useReducedMotion();
  const last = run.last;
  useEffect(() => { setTab('results'); setSelected(null); }, [last?.searchId]);
  const failedAfter = run.failedAt && (!run.lastAt || run.failedAt > run.lastAt);

  const applyQueryText = (q: string) => {
    setDraft({ mode: 'query', query: q });
    setNotice('Query text copied into the form. Running it creates a new search; earlier filters were not restored.');
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <div className="space-y-8 text-[#1F3D2B]" data-testid="resource-workspace">
      <motion.section {...fade} className="relative overflow-hidden rounded-lg border border-[#1F3D2B]/15 bg-[#E8DCC4]/70 p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Resource intelligence</p>
            <h2 className="font-display text-3xl leading-tight">Find real building blocks</h2>
            <p className="mt-1 max-w-2xl text-xs text-[#1F3D2B]/70">Provider APIs and the curated catalog supply source metadata. Ranking is a backend heuristic; popularity is not security or market validation.</p>
          </div>
        </div>
        <SearchForm projectId={projectId} />
      </motion.section>

      {(last || failedAfter || busy) && (
        <motion.section {...fade} aria-label="Latest run" className="space-y-3" data-testid="resource-run-summary">
          {busy && <p className="font-mono text-xs text-[#1F3D2B]/70">Querying providers. Nothing is shown until the run completes.</p>}
          {failedAfter && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs" data-testid="text-search-failed">
              The search attempt at {fmtWhen(run.failedAt)}{run.failedQuery ? ` for "${run.failedQuery}"` : ''} failed. Check history for any server-recorded diagnostics. The collection below still shows the last completed search, not this query.
            </p>
          )}
          {last && (
            <div className="space-y-2 rounded-md border border-[#1F3D2B]/12 bg-[#FBF7EE] p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="eyebrow">{failedAfter ? 'Last successful run' : 'This session\'s run'}</span>
                <span className="break-all font-mono">"{last.query}"</span>
                {last.cached && <span className="font-mono text-[10px] uppercase">cached</span>}
                {last.partial && <span className="font-mono text-[10px] uppercase text-destructive">partial</span>}
                <span className="font-mono text-[10px] uppercase">explain {last.explanationStatus}</span>
                <span className="font-mono text-[10px] text-[#1F3D2B]/55">{last.items.length} ranked items returned</span>
              </div>
              <ProviderStrip statuses={last.providerStatuses} />
              <p className="text-[10px] text-[#1F3D2B]/55">Provider counts are raw retrieval before de-duplication and ranking.</p>
              {last.explanationError && <p className="text-xs text-destructive break-words">Explanations unavailable: {last.explanationError}</p>}
              {last.requirements.length > 0 && <p className="text-xs break-words"><span className="eyebrow mr-2">Requirements</span>{last.requirements.join(' / ')}</p>}
              {last.generatedQueries && last.generatedQueries.length > 0 && (
                <details className="text-xs"><summary className="cursor-pointer">Provider query plan</summary>
                  <ul className="mt-2 space-y-1 font-mono text-[10px] break-words">{last.generatedQueries.map((g, i) => <li key={i}>{JSON.stringify(g)}</li>)}</ul>
                </details>
              )}
            </div>
          )}
        </motion.section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#1F3D2B]/15 pb-2">
          <div>
            <p className="eyebrow">{tab === 'results' ? 'Latest completed search only' : 'Bounded, 20 per page'}</p>
            <h2 className="font-display text-2xl">{tab === 'results' ? 'Collection' : 'Search history'}</h2>
          </div>
          <div role="tablist" className="flex rounded-full bg-[#1F3D2B]/8 p-1 text-sm">
            {(['results', 'history'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('min-h-9 rounded-full px-4', tab === t ? 'bg-[#1F3D2B] text-[#E8DCC4]' : 'text-[#1F3D2B]/70')} data-testid={`resource-tab-${t}`}>
                {t === 'results' ? 'Results' : 'History'}
              </button>
            ))}
          </div>
        </div>
        {tab === 'results' ? <Collection key={last?.searchId ?? 'persisted'} projectId={projectId} onOpen={setSelected} /> : <History projectId={projectId} onUseQuery={applyQueryText} />}
      </section>

      <ResourceDetail selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default ResourceWorkspace;
