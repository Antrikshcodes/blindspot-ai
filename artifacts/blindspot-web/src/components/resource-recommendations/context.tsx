import { Link } from 'wouter';
import type { Analysis, ResourceSearchHistory, ProviderStatus } from '@workspace/api-client-react';
import { RowsSkeleton } from '@/components/kit';
import { ProviderStrip } from '@/components/resource-search/providers';
import { fmtDate, readError } from '@/lib/api';

export type AnalysisState =
  | { kind: 'loading' }
  | { kind: 'present'; analysis: Analysis }
  | { kind: 'missing' }
  | { kind: 'unavailable'; message: string };

/** Only the explicit 404 ANALYSIS_NOT_FOUND code means "not analyzed". */
export function toAnalysisState(q: { isLoading: boolean; isError: boolean; error: unknown; data?: { data: Analysis } }): AnalysisState {
  if (q.isLoading) return { kind: 'loading' };
  if (q.isError) {
    const e = readError(q.error);
    if (e.status === 404 && e.code === 'ANALYSIS_NOT_FOUND') return { kind: 'missing' };
    return { kind: 'unavailable', message: e.message };
  }
  return q.data?.data ? { kind: 'present', analysis: q.data.data } : { kind: 'unavailable', message: 'No analysis payload returned.' };
}

export function ContextPanel({ projectId, analysis }: { projectId: string; analysis: AnalysisState }) {
  return (
    <section className="rounded-lg border border-[#1F3D2B]/12 bg-[#E8DCC4]/45 p-4" data-testid="recommendations-context">
      <p className="eyebrow mb-2">What the server will read</p>
      <p className="text-sm leading-relaxed text-[#1F3D2B]">
        The project description, problem, audience and proposed solution, plus technical requirements, assumptions and blindspots from the latest analysis when one exists.
        Experiments and hypothesis statuses are not connected to this search.
      </p>
      <div className="mt-3 text-xs" data-testid="recommendations-analysis-state">
        {analysis.kind === 'loading' && <RowsSkeleton rows={1} />}
        {analysis.kind === 'present' && <p className="text-[#1F3D2B]/75">Latest analysis loaded: version {analysis.analysis.version}, {fmtDate(analysis.analysis.createdAt)}. The server reads its current context for generation; stored recommendations may come from a different search.</p>}
        {analysis.kind === 'missing' && (
          <p className="text-[#1F3D2B]/80">This project has no analysis yet. Generation can use project context only when the required services are available. <Link href={`/projects/${projectId}`} className="font-medium underline" data-testid="link-recommendation-analyze">Analyze the project</Link> for richer requirements.</p>
        )}
        {analysis.kind === 'unavailable' && <p className="text-destructive">Could not check the latest analysis ({analysis.message}). This does not mean the project is unanalyzed.</p>}
      </div>
    </section>
  );
}

export type Provenance =
  | { kind: 'none' }
  | { kind: 'matched'; searchId: string; source: 'history' | 'session'; createdAt: string | null; query: string | null; requirements: string[]; analysisId: string | null | undefined; statuses: ProviderStatus[]; explanationStatus: string; partial: boolean; cached: boolean; status: string | null }
  | { kind: 'unmatched'; searchId: string; historyError: string | null; historyLoading: boolean };

export function matchProvenance(searchId: string | null, history: ResourceSearchHistory[] | undefined, sessionLast: { searchId: string; query?: string; requirements: string[]; analysisId?: string | null; providerStatuses: ProviderStatus[]; explanationStatus: string; partial?: boolean; cached: boolean } | null, historyLoading: boolean, historyError: string | null): Provenance {
  if (!searchId) return { kind: 'none' };
  const h = history?.find((x) => x.id === searchId);
  if (h) return { kind: 'matched', searchId, source: 'history', createdAt: h.createdAt, query: h.query, requirements: h.requirements, analysisId: h.analysisId, statuses: h.providerStatuses, explanationStatus: h.explanationStatus, partial: h.partial, cached: h.cached, status: h.status };
  if (sessionLast && sessionLast.searchId === searchId) return { kind: 'matched', searchId, source: 'session', createdAt: null, query: sessionLast.query ?? null, requirements: sessionLast.requirements, analysisId: sessionLast.analysisId, statuses: sessionLast.providerStatuses, explanationStatus: sessionLast.explanationStatus, partial: !!sessionLast.partial, cached: sessionLast.cached, status: null };
  return { kind: 'unmatched', searchId, historyError, historyLoading };
}

export function ProvenancePanel({ prov, analysis, mixed }: { prov: Provenance; analysis: AnalysisState; mixed: boolean }) {
  if (prov.kind === 'none') return null;
  const currentId = analysis.kind === 'present' ? analysis.analysis.id : null;
  return (
    <section className="rounded-lg border border-[#1F3D2B]/12 bg-[#FBF7EE] p-4" data-testid="recommendations-provenance">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">Provenance of this list</p>
        <span className="break-all font-mono text-[10px] text-[#1F3D2B]/55">search {prov.searchId}</span>
      </div>
      {mixed && <p className="mb-2 text-xs text-destructive">Rows on this page reference more than one search; provenance shown is for the first row only.</p>}
      {prov.kind === 'unmatched' ? (
        prov.historyLoading ? <RowsSkeleton rows={1} /> : (
          <p className="text-xs text-[#1F3D2B]/70">
            {prov.historyError ? `Search history could not be loaded (${prov.historyError}). Recommendations are real, but their stored context is unavailable here.` : 'This search is not in the 20 most recent history entries, so its stored requirements and analysis link are unavailable.'}
          </p>
        )
      ) : (
        <div className="space-y-3 text-xs">
          <p className="text-[#1F3D2B]/75">
            {prov.createdAt ? `Completed ${fmtDate(prov.createdAt)}.` : 'Completed in this session.'}
            {prov.status ? ` Status ${prov.status}.` : ''}{prov.partial ? ' Partial results.' : ''}{prov.cached ? ' Served from cache.' : ''}
          </p>
          <p data-testid="recommendations-provenance-analysis">
            {prov.analysisId === undefined
              ? 'An analysis link was not returned for this search.'
              : prov.analysisId === null
              ? 'This search used project context without an analysis.'
              : !currentId
                ? `This search recorded analysis ${prov.analysisId.slice(0, 8)}. The current latest analysis is unavailable for comparison.`
                : currentId === prov.analysisId
                ? 'This search matches the latest analysis loaded here.'
                : `This search recorded analysis ${prov.analysisId.slice(0, 8)}, different from the latest analysis loaded here. Regenerate from current server context if needed.`}
          </p>
          <p className="break-words"><span className="eyebrow">Stored search query </span>{prov.query ?? 'Not returned'}</p>
          {prov.requirements.length > 0 ? (
            <div><p className="eyebrow mb-1">Stored requirements</p><ul className="list-disc space-y-0.5 pl-5 text-[#1F3D2B]/80">{prov.requirements.map((r, i) => <li key={i} className="break-words">{r}</li>)}</ul></div>
          ) : <p className="italic text-[#1F3D2B]/60">No requirements stored for this search.</p>}
          <p>AI explanations: <span className="font-mono">{prov.explanationStatus}</span></p>
          <ProviderStrip statuses={prov.statuses} idPrefix="recommendations-provider-status" />
        </div>
      )}
    </section>
  );
}
