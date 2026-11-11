import { ExternalLink, Sparkles } from 'lucide-react';
import { useGetResource, getGetResourceQueryKey, type Explanation, type Resource } from '@workspace/api-client-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErrorPanel, KV, RowsSkeleton } from '@/components/kit';
import { CATEGORY_META, fmtWhen, safeExternal } from '@/lib/resource-search';

export type RecContext = {
  searchId: string;
  relevanceScore: number;
  qualityScore: number;
  rankScore: number;
  ranking: Record<string, unknown>;
  sourceSnapshot: Record<string, unknown>;
  explanation: Explanation | null;
};
export type Selected = { resource: Resource; rec?: RecContext; origin: string };

export function ExternalLinkSafe({ url, testId = 'link-resource-external' }: { url: string; testId?: string }) {
  const safe = safeExternal(url);
  if (!safe) return <span className="font-mono text-[11px] text-[#1F3D2B]/55">Link withheld (unsafe or invalid URL)</span>;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 max-w-full items-center gap-1 break-all text-xs text-[#1F3D2B] underline decoration-[#1F3D2B]/30 underline-offset-4 hover:decoration-[#1F3D2B]" data-testid={testId}>
      {new URL(safe).host}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
    </a>
  );
}

export function ScoreBar({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" title={`${label}: backend heuristic, not an endorsement`}>
      <span className="text-[#1F3D2B]/60">{label}</span>
      <span className={`font-mono tabular-nums ${strong ? 'font-semibold' : ''}`}>{v}</span>
    </span>
  );
}

export function AiTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-[#8B5CF6]/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8B5CF6]">
      <Sparkles className="h-3 w-3" aria-hidden />AI / review required
    </span>
  );
}

export function ResourceDetail({ selected, onClose }: { selected: Selected | null; onClose: () => void }) {
  const rid = selected?.resource.id ?? '';
  const q = useGetResource(rid, { query: { enabled: !!rid, queryKey: getGetResourceQueryKey(rid) } });
  const cur = q.data?.data;
  const rec = selected?.rec;
  const snapUpdated = rec?.sourceSnapshot?.sourceUpdatedAt;
  const drift = cur && rec && typeof snapUpdated === 'string' && snapUpdated !== cur.sourceUpdatedAt;
  return (
    <Sheet open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-[#F6F0E2] sm:max-w-xl" data-testid="resource-detail">
        {selected && (
          <>
            <SheetHeader>
              <p className="eyebrow break-words">{selected.resource.provider} / {CATEGORY_META[selected.resource.category]?.label ?? selected.resource.category}</p>
              <SheetTitle className="break-words font-display text-2xl text-[#1F3D2B]">{selected.resource.name}</SheetTitle>
              <SheetDescription className="text-xs">
                Opened from: {selected.origin}. Source facts and ranking context are separate. Unknown means the source did not report it. Security, maintenance, pricing and license suitability are not verified.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-6 text-sm">
              <section>
                <p className="eyebrow mb-2">Current source record</p>
                {q.isLoading ? <RowsSkeleton rows={2} /> : q.isError ? <ErrorPanel error={q.error} onRetry={() => q.refetch()} title="Could not load current record" /> : cur ? (
                  <div className="space-y-3 rounded-md border border-[#1F3D2B]/12 bg-[#FBF7EE] p-3">
                    <p className="break-words">{cur.description || <span className="italic text-[#1F3D2B]/55">No description reported by source.</span>}</p>
                    <ExternalLinkSafe url={cur.url} />
                    {cur.sourceApiUrl && <p className="text-xs">Source API: <ExternalLinkSafe url={cur.sourceApiUrl} testId="link-resource-source-api" /></p>}
                    <KV data={{ license: cur.license, language: cur.language, externalId: cur.externalId, tags: cur.tags, sourceCreatedAt: cur.sourceCreatedAt ?? null }} />
                    <p className="font-mono text-[10px] text-[#1F3D2B]/60">Source last update {fmtWhen(cur.sourceUpdatedAt)} / retrieved {fmtWhen(cur.retrievedAt)}</p>
                    <Raw title="Quality signals (null = unknown)" data={cur.qualitySignals} />
                    {cur.popularity_metrics && <Raw title="Popularity metrics (not validation)" data={cur.popularity_metrics} />}
                    {cur.maintenance_signals && <Raw title="Maintenance signals (as reported)" data={cur.maintenance_signals} />}
                    {cur.technical_metadata && <Raw title="Technical metadata" data={cur.technical_metadata} />}
                    <Raw title="Source metadata" data={cur.sourceMetadata} />
                  </div>
                ) : <p className="text-xs italic text-[#1F3D2B]/60">No current record returned.</p>}
              </section>
              {drift && <p className="rounded border border-[#1F3D2B]/20 bg-[#E8DCC4] p-2 text-xs" data-testid="text-snapshot-drift">The current record differs from the snapshot taken at search time. Ranking below reflects the snapshot.</p>}
              {rec ? (
                <>
                  <section>
                    <p className="eyebrow mb-2">Ranking at search time (heuristic, not endorsement)</p>
                    <div className="mb-2 flex flex-wrap gap-3"><ScoreBar label="Rank" v={rec.rankScore} strong /><ScoreBar label="Relevance" v={rec.relevanceScore} /><ScoreBar label="Quality" v={rec.qualityScore} /></div>
                    <div className="rounded-md border border-[#1F3D2B]/12 bg-[#FBF7EE] p-3"><KV data={rec.ranking} /></div>
                  </section>
                  <section>
                    <div className="mb-2 flex items-center justify-between gap-2"><p className="eyebrow">Explanation</p>{rec.explanation && <AiTag />}</div>
                    {rec.explanation ? (
                      <div className="space-y-2 rounded-md border border-dashed border-[#8B5CF6]/40 bg-[#8B5CF6]/5 p-3 break-words">
                        <p><span className="eyebrow">Use case </span>{rec.explanation.recommendedUseCase}</p>
                        <p>{rec.explanation.explanation}</p>
                        <p><span className="eyebrow">Estimated difficulty </span>{rec.explanation.integrationDifficulty}</p>
                        {rec.explanation.limitations.length > 0 && <ul className="list-disc pl-5 text-xs">{rec.explanation.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>}
                        <p className="text-[10px] text-[#1F3D2B]/60">Generated text, not approval. Verify against the source before relying on it.</p>
                      </div>
                    ) : <p className="text-xs italic text-[#1F3D2B]/60">No explanation (off or unavailable for this search).</p>}
                  </section>
                  <section>
                    <p className="eyebrow mb-2 break-all">Snapshot from search {rec.searchId.slice(0, 8)}</p>
                    <div className="rounded-md border border-[#1F3D2B]/12 bg-[#E8DCC4]/40 p-3"><KV data={rec.sourceSnapshot} /></div>
                  </section>
                </>
              ) : <p className="rounded border border-dashed p-3 text-xs text-[#1F3D2B]/60">No ranking context attached to this view.</p>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Raw({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs text-[#1F3D2B]/65">{title}</summary>
      <KV data={data} className="mt-2" />
    </details>
  );
}
