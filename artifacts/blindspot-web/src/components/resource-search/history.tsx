import { useState } from 'react';
import { ChevronDown, CornerDownLeft } from 'lucide-react';
import { useListResourceSearches, getListResourceSearchesQueryKey, type ResourceSearchHistory } from '@workspace/api-client-react';
import { EmptyState, ErrorPanel, KV, Pager, RowsSkeleton } from '@/components/kit';
import { cn } from '@/lib/utils';
import { fmtWhen } from '@/lib/resource-search';
import { ProviderStrip } from './providers';

const LIMIT = 20;

export function History({ projectId, onUseQuery }: { projectId: string; onUseQuery: (q: string) => void }) {
  const [page, setPage] = useState(1);
  const params = { page, limit: LIMIT };
  const q = useListResourceSearches(projectId, params, { query: { queryKey: getListResourceSearchesQueryKey(projectId, params) } });
  const items = q.data?.data.items ?? [];
  return (
    <div>
      <p className="mb-3 text-xs text-[#1F3D2B]/65">Run log only. The current API cannot retrieve a past result set by search ID. Reusing query text prepares a new explicit search; earlier filters are not restored.</p>
      {q.isLoading ? <RowsSkeleton rows={3} /> : q.isError ? <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load search history" /> :
        items.length === 0 ? <EmptyState mark="LOG" title="No searches yet" body="Completed searches and provider failures recorded by the server appear here. Requests rejected before search persistence may not be logged." /> : (
          <ul className="space-y-2">{items.map((h) => <Row key={h.id} h={h} onUseQuery={onUseQuery} />)}</ul>
        )}
      <Pager page={page} setPage={setPage} count={items.length} limit={LIMIT} label="History pagination" />
    </div>
  );
}

function Row({ h, onUseQuery }: { h: ResourceSearchHistory; onUseQuery: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const failed = h.status.toUpperCase() === 'FAILED';
  return (
    <li className={cn('rounded-md border bg-[#FBF7EE] p-3', failed ? 'border-destructive/30' : 'border-[#1F3D2B]/12')} data-testid={`resource-history-${h.id}`}>
      <div className="flex flex-wrap items-start gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 min-w-0 flex-1 items-start gap-2 text-left" data-testid={`button-expand-history-${h.id}`}>
          <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
          <span className="min-w-0">
            <span className="block break-words font-display text-base text-[#1F3D2B]">{h.query || <em className="text-[#1F3D2B]/55">(auto from project)</em>}</span>
            <span className="flex flex-wrap gap-2 font-mono text-[10px] uppercase text-[#1F3D2B]/60">
              <span>{fmtWhen(h.createdAt)}</span><span className={failed ? 'text-destructive' : ''}>{h.status}</span>
              {h.partial && <span>partial</span>}{h.cached && <span>cached</span>}<span>explain {h.explanationStatus}</span>
            </span>
          </span>
        </button>
        {h.query && (
          <button type="button" onClick={() => onUseQuery(h.query)} className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[#1F3D2B]/20 px-3 text-xs hover:border-[#1F3D2B]/50" data-testid={`button-use-query-${h.id}`}>
            <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />Use query text
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t border-[#1F3D2B]/10 pt-3 text-xs">
          <ProviderStrip statuses={h.providerStatuses} idPrefix={`history-provider-${h.id}`} />
          <p className="text-[10px] text-[#1F3D2B]/55">Counts are raw retrieval before de-duplication and ranking, not final result counts.</p>
          {h.requirements.length > 0 && <p className="break-words"><span className="eyebrow mr-2">Requirements</span>{h.requirements.join(' / ')}</p>}
          {h.queries.length > 0 && (
            <ul className="space-y-1.5">
              {h.queries.map((d) => (
                <li key={d.id} className="rounded border border-[#1F3D2B]/10 p-2 font-mono text-[10px] break-words">
                  <span className="font-medium">{d.providerId}/{d.adapterName}</span> "{d.query}" {d.status} / {d.count} retrieved / {d.durationMs}ms{d.cached ? ' / cached' : ''}
                  {d.error && <span className="block text-destructive">{d.error}</span>}
                  {d.retryAfterSeconds !== null && <span className="block">retry after {d.retryAfterSeconds}s</span>}
                  <details className="mt-1"><summary className="cursor-pointer">Provider parameters</summary><KV data={d.parameters} /></details>
                </li>
              ))}
            </ul>
          )}
          {h.queryPlan && <details><summary className="cursor-pointer text-[#1F3D2B]/65">Query plan</summary><KV data={h.queryPlan} className="mt-2" /></details>}
        </div>
      )}
    </li>
  );
}
