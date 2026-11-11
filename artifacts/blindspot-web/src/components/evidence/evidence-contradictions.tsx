import { useGetFeedbackSummary, getGetFeedbackSummaryQueryKey, type Assumption, type Evidence } from '@workspace/api-client-react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AiLabel, ErrorPanel, RowsSkeleton } from '@/components/kit';
import { fmtDate } from '@/lib/api';
import { evidenceForFeedback } from '@/lib/evidence';
import { useStagger } from '@/components/discovery/motion';

const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

export function EvidenceContradictions({ projectId, records, assumptions, onOpenSource, onSelectEvidence }: {
  projectId: string; records: Evidence[]; assumptions: Assumption[]; onOpenSource: (feedbackId: string) => void; onSelectEvidence: (id: string) => void;
}) {
  const sq = useGetFeedbackSummary(projectId, { query: { enabled: !!projectId, queryKey: getGetFeedbackSummaryQueryKey(projectId) } });
  const stagger = useStagger();
  const summary = sq.data?.data ?? null;
  const byId = new Map(assumptions.map((a) => [a.id, a]));
  const list = (summary?.result.contradictions ?? []).map((c) => ({
    a: str(c.feedbackAId), b: str(c.feedbackBId), qa: str(c.quoteA), qb: str(c.quoteB), why: str(c.explanation),
  }));

  return (
    <section className="space-y-3 rounded-md border border-[#8B5CF6]/25 bg-[#FBF8F1] p-4" data-testid="evidence-contradictions" aria-label="AI-detected contradictions">
      <div className="flex flex-wrap items-center gap-2">
        <p className="eyebrow text-[#1F3D2B]">Conflicts the model noticed ({list.length})</p>
        <AiLabel review />
        {summary && <span className="font-mono text-[10.5px] text-[#1F3D2B]/60">from summary {fmtDate(summary.createdAt)}</span>}
      </div>
      <p className="text-xs text-[#1F3D2B]/70">AI-detected tension between two notes. Not a proven contradiction, and nothing here can be marked verified. Related hypotheses are found only through loaded evidence that cites the same feedback reference.</p>
      {sq.isLoading ? <RowsSkeleton rows={2} /> : sq.isError ? (
        <ErrorPanel error={sq.error} onRetry={() => sq.refetch()} title="Could not load contradictions" />
      ) : !summary ? (
        <p className="rounded border border-dashed border-[#1F3D2B]/20 p-3 text-xs text-[#1F3D2B]/70">No feedback summary yet. Run the analysis below to look for conflicts.</p>
      ) : list.length === 0 ? (
        <p className="rounded border border-dashed border-[#1F3D2B]/20 p-3 text-xs text-[#1F3D2B]/70">The latest summary reported no contradictions.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((c, i) => (
            <motion.li key={i} {...stagger(i)} className="space-y-2 rounded border border-[#8B5CF6]/25 bg-[#FFFDF8] p-3" data-testid={`contradiction-${i}`}>
              {c.why && <p className="break-words text-sm text-[#1F3D2B]">{c.why}</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {([[c.qa, c.a, 'A'], [c.qb, c.b, 'B']] as const).map(([q, fid, side]) => {
                  const linked = evidenceForFeedback(records, fid);
                  return (
                    <div key={side} className="min-w-0 space-y-1.5">
                      {q && <blockquote className="whitespace-pre-wrap break-words border-l-2 border-[#8B5CF6]/60 pl-2 font-display text-sm italic">"{q}"</blockquote>}
                      {fid ? <>
                        <p className="break-all font-mono text-[10px] text-[#1F3D2B]/55">Feedback reference: {fid}</p>
                        <Button size="sm" variant="outline" className="h-7 border-[#1F3D2B]/25 text-xs text-[#1F3D2B]" onClick={() => onOpenSource(fid)} data-testid={`contradiction-open-source-${i}-${side}`}>
                          <ExternalLink className="mr-1 h-3 w-3" aria-hidden />Locate source
                        </Button>
                        {linked.length > 0 ? (
                          <ul className="space-y-1">
                            {linked.map((e) => (
                              <li key={e.id}>
                                <button type="button" onClick={() => onSelectEvidence(e.id)} className="w-full break-words text-left text-[11px] text-[#1F3D2B]/80 underline-offset-2 hover:underline" data-testid={`contradiction-evidence-${e.id}`}>
                                  Loaded evidence on: {byId.get(e.assumptionId)?.description ?? e.assumptionId}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-[11px] italic text-[#1F3D2B]/55">No loaded evidence cites this note.</p>}
                      </> : <p className="text-[11px] italic text-[#1F3D2B]/55">No feedback reference returned.</p>}
                    </div>
                  );
                })}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
